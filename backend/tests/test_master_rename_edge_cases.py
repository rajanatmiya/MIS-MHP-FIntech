"""Edge-case tests for _propagate_master_rename (whitespace / case / regex-metachar tolerance).

For each of the 6 master types, a loan is created whose value contains leading+trailing
whitespace AND a different case than the master entry. Renaming the master must still
update the loan record (GET /api/loans/{id} and GET /api/loans list).
"""
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
SUF = uuid.uuid4().hex[:6]

MAPPING = {
    "customers": "customer_name",
    "executives": "executive_name",
    "managers": "team_manager",
    "banks": "bank",
    "agents": "agent_name",
    "companies": "company_name",
}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    body = r.json()
    token = body.get("access_token") or body.get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _find_master_ci(client, coll, name):
    """Case-insensitive + trim-tolerant lookup of a master entry."""
    lst = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30).json()
    for item in lst:
        if (item.get("name") or "").strip().lower() == name.strip().lower():
            return item
    return None


def _create_master(client, coll, name):
    """Return id of the master entry for `name`, creating it if loan auto-sync didn't."""
    existing = _find_master_ci(client, coll, name)
    if existing:
        return existing["id"]
    payload = {"name": name}
    if coll == "customers":
        payload["contact_no"] = "9998887000"
    r = client.post(f"{BASE_URL}/api/master/{coll}", json=payload, timeout=30)
    if r.status_code == 200:
        return r.json()["id"]
    existing = _find_master_ci(client, coll, name)
    if existing:
        return existing["id"]
    pytest.fail(f"Could not create master {coll} '{name}': {r.status_code} {r.text[:200]}")


def _cleanup_master_by_name(client, coll, name):
    lst = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30).json()
    for item in lst:
        if (item.get("name") or "").strip().lower() == name.strip().lower():
            client.delete(f"{BASE_URL}/api/master/{coll}/{item['id']}", timeout=30)


# --- whitespace + case tolerant propagation for all 6 master types ---
@pytest.mark.parametrize("coll", list(MAPPING.keys()))
def test_rename_tolerates_whitespace_and_case(client, coll):
    field = MAPPING[coll]
    master_name = f"TEST_Edge_{coll}_{SUF}"           # canonical master value
    loan_value = f"  {master_name.upper()}  "         # untrimmed + different case in loan
    new_name = f"{master_name}_NEW"

    loan_payload = {
        "agent_name": "", "customer_name": f"TEST_EdgeCust_{coll}_{SUF}",
        "company_name": f"TEST_EdgeComp_{coll}_{SUF}", "contact_no": "9998887000",
        "status": "Login", "bank": "SBI", "executive_name": f"TEST_EdgeExec_{coll}_{SUF}",
        "team_manager": f"TEST_EdgeMgr_{coll}_{SUF}",
        "month": "Apr-2026", "group_month": "Apr-2026", "amount": "50000",
    }
    loan_payload[field] = loan_value

    r = client.post(f"{BASE_URL}/api/loans", json=loan_payload, timeout=30)
    assert r.status_code == 200, f"loan create failed: {r.status_code} {r.text[:300]}"
    loan_id = r.json()["id"]
    mid = None
    try:
        mid = _create_master(client, coll, master_name)
        put_body = {"name": new_name}
        if coll == "customers":
            put_body["contact_no"] = "9998887000"
        pr = client.put(f"{BASE_URL}/api/master/{coll}/{mid}", json=put_body, timeout=30)
        assert pr.status_code == 200, f"PUT failed: {pr.status_code} {pr.text[:300]}"

        # single-loan read
        loan = client.get(f"{BASE_URL}/api/loans/{loan_id}", timeout=30).json()
        assert loan[field] == new_name, (
            f"{coll}: loan.{field} == {loan[field]!r}, expected {new_name!r} "
            f"(loan stored {loan_value!r}, master was {master_name!r})"
        )

        # list read (what MIS/loan grid consumes)
        lst = client.get(f"{BASE_URL}/api/loans", params={"limit": 200}, timeout=30).json()
        rows = lst["loans"] if isinstance(lst, dict) else lst
        target = next((x for x in rows if x["id"] == loan_id), None)
        assert target is not None, "created loan missing from GET /api/loans"
        assert target[field] == new_name, f"GET /api/loans shows stale {field}: {target[field]!r}"
    finally:
        client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=30)
        if mid:
            client.delete(f"{BASE_URL}/api/master/{coll}/{mid}", timeout=30)
        for n in (master_name, new_name, loan_value):
            _cleanup_master_by_name(client, coll, n)
        for c, f in MAPPING.items():
            _cleanup_master_by_name(client, c, loan_payload.get(f) or "")


# --- regex metacharacters in the old name must not break matching or over-match ---
def test_rename_with_regex_metacharacters(client):
    meta_name = f"TEST_Meta.(A+B)[{SUF}]"
    other_name = f"TEST_MetaXXAXBXX{SUF}"   # would match if metachars were unescaped
    new_name = f"TEST_Meta_Renamed_{SUF}"

    p1 = {"agent_name": "", "customer_name": meta_name, "company_name": "TEST_Co",
          "contact_no": "9998887001", "status": "Login", "bank": "SBI",
          "month": "Apr-2026", "group_month": "Apr-2026"}
    p2 = dict(p1, customer_name=other_name, contact_no="9998887002")
    r1 = client.post(f"{BASE_URL}/api/loans", json=p1, timeout=30)
    r2 = client.post(f"{BASE_URL}/api/loans", json=p2, timeout=30)
    assert r1.status_code == 200 and r2.status_code == 200
    id1, id2 = r1.json()["id"], r2.json()["id"]
    mid = None
    try:
        mid = _create_master(client, "customers", meta_name)
        pr = client.put(f"{BASE_URL}/api/master/customers/{mid}",
                        json={"name": new_name, "contact_no": "9998887001"}, timeout=30)
        assert pr.status_code == 200, pr.text[:300]

        l1 = client.get(f"{BASE_URL}/api/loans/{id1}", timeout=30).json()
        l2 = client.get(f"{BASE_URL}/api/loans/{id2}", timeout=30).json()
        assert l1["customer_name"] == new_name, f"metachar name not renamed: {l1['customer_name']!r}"
        assert l2["customer_name"] == other_name, f"unrelated loan over-matched: {l2['customer_name']!r}"
    finally:
        client.delete(f"{BASE_URL}/api/loans/{id1}", timeout=30)
        client.delete(f"{BASE_URL}/api/loans/{id2}", timeout=30)
        if mid:
            client.delete(f"{BASE_URL}/api/master/customers/{mid}", timeout=30)
        for n in (meta_name, other_name, new_name):
            _cleanup_master_by_name(client, "customers", n)


# --- renaming must not touch loans whose value merely starts with the old name ---
def test_rename_does_not_affect_prefix_matches(client):
    base = f"TEST_Prefix_{SUF}"
    sibling = f"{base}_Sibling"
    new_name = f"{base}_Renamed"

    p1 = {"agent_name": "", "customer_name": base, "company_name": "TEST_Co",
          "contact_no": "9998887003", "status": "Login", "bank": "SBI",
          "month": "Apr-2026", "group_month": "Apr-2026"}
    p2 = dict(p1, customer_name=sibling, contact_no="9998887004")
    r1 = client.post(f"{BASE_URL}/api/loans", json=p1, timeout=30)
    r2 = client.post(f"{BASE_URL}/api/loans", json=p2, timeout=30)
    assert r1.status_code == 200 and r2.status_code == 200
    id1, id2 = r1.json()["id"], r2.json()["id"]
    mid = None
    try:
        mid = _create_master(client, "customers", base)
        pr = client.put(f"{BASE_URL}/api/master/customers/{mid}",
                        json={"name": new_name, "contact_no": "9998887003"}, timeout=30)
        assert pr.status_code == 200, pr.text[:300]
        l1 = client.get(f"{BASE_URL}/api/loans/{id1}", timeout=30).json()
        l2 = client.get(f"{BASE_URL}/api/loans/{id2}", timeout=30).json()
        assert l1["customer_name"] == new_name
        assert l2["customer_name"] == sibling, f"prefix loan wrongly renamed to {l2['customer_name']!r}"
    finally:
        client.delete(f"{BASE_URL}/api/loans/{id1}", timeout=30)
        client.delete(f"{BASE_URL}/api/loans/{id2}", timeout=30)
        if mid:
            client.delete(f"{BASE_URL}/api/master/customers/{mid}", timeout=30)
        for n in (base, sibling, new_name):
            _cleanup_master_by_name(client, "customers", n)


# --- trim migration assertion: no loan text field retains leading/trailing whitespace ---
def test_no_untrimmed_loan_fields_remain(client):
    fields = ["customer_name", "company_name", "bank", "executive_name",
              "team_manager", "agent_name", "contact_no", "branch", "location"]
    r = client.get(f"{BASE_URL}/api/loans", params={"limit": 500}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    rows = r.json()["loans"] if isinstance(r.json(), dict) else r.json()
    offenders = []
    for row in rows:
        for f in fields:
            v = row.get(f)
            if isinstance(v, str) and v != v.strip():
                offenders.append((row.get("id"), f, v))
    assert not offenders, f"Untrimmed loan fields still present: {offenders[:10]}"
