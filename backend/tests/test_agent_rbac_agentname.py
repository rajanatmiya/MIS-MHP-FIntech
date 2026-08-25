"""RBAC tests: agent sees loans where created_by == agent.id OR agent_name == agent.name"""
import os
import uuid
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "admin@mhpfintech.com", "password": "Admin@123"}
AGENT = {"email": "agent@mhpfintech.com", "password": "Admin@123"}


def login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {creds['email']}: {r.status_code} {r.text[:300]}")
    data = r.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def admin_ctx():
    token, user = login(ADMIN)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s, user


@pytest.fixture(scope="module")
def agent_ctx():
    token, user = login(AGENT)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s, user


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_ctx, created_ids):
    yield
    s, _ = admin_ctx
    for lid in created_ids:
        s.delete(f"{BASE_URL}/api/loans/{lid}", timeout=60)


def make_loan_payload(agent_name, tag):
    return {
        "customer_name": f"TEST_{tag}_{uuid.uuid4().hex[:6]}",
        "contact_no": "9990001111",
        "company_name": "TEST_CO",
        "bank": "SBI",
        "loan_amount": 100000,
        "agent_name": agent_name,
        "month": "Apr-2026",
        "status": "Login",
    }


class TestAgentRbac:
    def test_agent_user_name(self, agent_ctx):
        _, user = agent_ctx
        assert user["role"] == "agent"
        print("Agent name:", user["name"], "id:", user["id"])

    def test_agent_sees_loan_matching_agent_name(self, admin_ctx, agent_ctx, created_ids):
        s_admin, _ = admin_ctx
        s_agent, agent_user = agent_ctx
        payload = make_loan_payload(agent_user["name"], "OWNNAME")
        r = s_admin.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:400]
        loan = r.json()
        created_ids.append(loan["id"])
        assert loan["agent_name"] == agent_user["name"]

        r2 = s_agent.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=90)
        assert r2.status_code == 200, r2.text[:300]
        ids = [l["id"] for l in r2.json()["loans"]]
        assert loan["id"] in ids, "Agent should see loan with matching agent_name"

    def test_agent_does_not_see_other_agent_loan(self, admin_ctx, agent_ctx, created_ids):
        s_admin, _ = admin_ctx
        s_agent, _ = agent_ctx
        payload = make_loan_payload("Other Agent QA", "OTHER")
        r = s_admin.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:400]
        loan = r.json()
        created_ids.append(loan["id"])

        r2 = s_agent.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=90)
        assert r2.status_code == 200
        ids = [l["id"] for l in r2.json()["loans"]]
        assert loan["id"] not in ids, "Agent must NOT see other agent's loan"

    def test_all_agent_visible_loans_belong_to_agent(self, agent_ctx):
        s_agent, agent_user = agent_ctx
        r = s_agent.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=90)
        assert r.status_code == 200
        loans = r.json()["loans"]
        violations = [
            {"id": l["id"], "agent_name": l.get("agent_name"), "created_by": l.get("created_by")}
            for l in loans
            if l.get("created_by") != agent_user["id"] and l.get("agent_name") != agent_user["name"]
        ]
        print(f"Total agent-visible loans: {len(loans)}, violations: {len(violations)}")
        assert not violations, f"Leaked loans: {violations[:5]}"

    def test_agent_search_preserves_rbac(self, agent_ctx):
        s_agent, agent_user = agent_ctx
        r = s_agent.get(f"{BASE_URL}/api/loans", params={"search": "TEST_", "limit": 2000}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        loans = r.json()["loans"]
        bad = [l["id"] for l in loans
               if l.get("created_by") != agent_user["id"] and l.get("agent_name") != agent_user["name"]]
        assert not bad, f"Search bypassed RBAC: {bad[:5]}"

    def test_admin_sees_both_loans(self, admin_ctx, created_ids):
        s_admin, _ = admin_ctx
        r = s_admin.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=90)
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()["loans"]]
        for lid in created_ids:
            assert lid in ids, f"Admin should see {lid}"

    def test_agent_analytics_overview_ok(self, agent_ctx):
        s_agent, _ = agent_ctx
        r = s_agent.get(f"{BASE_URL}/api/analytics/overview", timeout=90)
        assert r.status_code == 200, r.text[:300]
        print("Agent overview:", r.json())

    def test_agent_analytics_by_agent_only_self(self, agent_ctx):
        s_agent, agent_user = agent_ctx
        r = s_agent.get(f"{BASE_URL}/api/analytics/by-agent", timeout=90)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # API returns dict keyed by agent_name
        names = list(data.keys()) if isinstance(data, dict) else [
            (row.get("agent_name") or row.get("name")) for row in data]
        print("by-agent names for agent:", names)
        # names must be limited to agent_names present in the agent's own visible loans
        rl = s_agent.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=90)
        allowed = {l.get("agent_name") or "Unknown" for l in rl.json()["loans"]}
        leaked = [n for n in names if n not in allowed]
        assert not leaked, f"by-agent leaked agents outside own loans: {leaked[:5]}"
        assert agent_user["name"] in names or not names

    def test_master_customers_accessible_for_forms(self, admin_ctx):
        s_admin, _ = admin_ctx
        for ep in ["customers", "executives", "managers"]:
            r = s_admin.get(f"{BASE_URL}/api/master/{ep}", timeout=60)
            assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"
            print(ep, "count:", len(r.json()))


# Agent write-path checks
class TestAgentWritePath:
    def test_agent_creates_own_loan_and_sees_it(self, agent_ctx):
        s, user = agent_ctx
        payload = make_loan_payload(user["name"], "AGENTOWN")
        r = s.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:400]
        loan = r.json()
        assert loan["created_by"] == user["id"]
        g = s.get(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
        assert g.status_code == 200
        # update
        u = s.put(f"{BASE_URL}/api/loans/{loan['id']}", json={"status": "Disbursed"}, timeout=60)
        assert u.status_code == 200, u.text[:300]
        g2 = s.get(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
        assert g2.json()["status"] == "Disbursed"
        d = s.delete(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
        print("agent delete own loan status:", d.status_code)
        if d.status_code in (200, 204):
            g3 = s.get(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
            assert g3.status_code == 404
        else:
            # not permitted -> admin cleanup
            assert d.status_code == 403

    def test_agent_cannot_read_other_agent_loan_by_id(self, admin_ctx, agent_ctx, created_ids):
        s_admin, _ = admin_ctx
        s_agent, _ = agent_ctx
        r = s_admin.post(f"{BASE_URL}/api/loans", json=make_loan_payload("Other Agent QA2", "OTHER2"), timeout=60)
        assert r.status_code in (200, 201)
        lid = r.json()["id"]
        created_ids.append(lid)
        g = s_agent.get(f"{BASE_URL}/api/loans/{lid}", timeout=60)
        print("agent GET other-agent loan by id ->", g.status_code)
        assert g.status_code in (403, 404), f"Agent could read other agent's loan detail: {g.status_code}"
