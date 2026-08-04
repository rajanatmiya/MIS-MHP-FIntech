"""Tests for Team Leaderboard (float conversion crash fix) and MIS branch/location filter data."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "admin@mhpfintech.com", "password": "Admin@123"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"no token in {r.json()}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# --- Team Leaderboard ---
class TestTeamLeaderboard:
    def test_leaderboard_no_500(self, client):
        r = client.get(f"{BASE_URL}/api/analytics/team-leaderboard", timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        data = r.json()
        assert isinstance(data.get("leaderboard"), list)
        assert isinstance(data.get("total_agents"), int)
        assert isinstance(data.get("total_loans"), int)
        assert data["total_agents"] == len(data["leaderboard"])

    def test_leaderboard_entry_shape_and_sorting(self, client):
        r = client.get(f"{BASE_URL}/api/analytics/team-leaderboard", timeout=90)
        assert r.status_code == 200
        lb = r.json()["leaderboard"]
        if not lb:
            pytest.skip("no leaderboard data")
        keys = {"agent_name", "role", "total_loans", "sanction_amount", "disbursed_amount",
                "disbursed_count", "pending_count", "declined_count", "rank",
                "conversion_rate", "target_amount", "target_progress"}
        for e in lb:
            assert keys.issubset(e.keys()), f"missing keys: {keys - set(e.keys())}"
            assert isinstance(e["disbursed_amount"], (int, float))
            assert e["disbursed_amount"] == e["disbursed_amount"], "NaN leaked into response"
            assert e["sanction_amount"] == e["sanction_amount"], "NaN leaked into response"
        amounts = [e["disbursed_amount"] for e in lb]
        assert amounts == sorted(amounts, reverse=True)
        assert [e["rank"] for e in lb] == list(range(1, len(lb) + 1))

    def test_leaderboard_with_month_filter(self, client):
        r = client.get(f"{BASE_URL}/api/analytics/team-leaderboard", params={"month": "Apr-2026"}, timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        assert isinstance(r.json()["leaderboard"], list)

    def test_leaderboard_bad_data_resilience(self, client):
        """Insert a loan with non-numeric sanction/disbursed; endpoint must not 500."""
        payload = {
            "agent_name": "Agent User", "customer_name": "TEST_BadNumber",
            "company_name": "TEST_CO", "contact_no": "9999999999", "bank": "TEST BANK",
            "status": "Login", "sanction": "N/A", "disbursed": "abc,,",
            "month": "Apr-2026", "group_month": "Apr-2026",
            "branch": "TEST_BRANCH", "location": "TEST_LOCATION",
        }
        cr = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert cr.status_code in (200, 201), f"create failed {cr.status_code}: {cr.text[:300]}"
        loan_id = cr.json().get("id")
        try:
            r = client.get(f"{BASE_URL}/api/analytics/team-leaderboard", timeout=90)
            assert r.status_code == 200, f"leaderboard crashed with bad data: {r.status_code} {r.text[:500]}"
            for e in r.json()["leaderboard"]:
                assert e["sanction_amount"] == e["sanction_amount"]
                assert e["disbursed_amount"] == e["disbursed_amount"]
        finally:
            if loan_id:
                d = client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=60)
                assert d.status_code in (200, 204, 404)

    def test_leaderboard_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", timeout=60)
        assert r.status_code in (401, 403), f"unexpected {r.status_code}"


# --- MIS filters data sources ---
class TestMISFilterData:
    def test_master_branches(self, client):
        r = client.get(f"{BASE_URL}/api/master/branches", timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert isinstance(r.json(), list)

    def test_master_locations(self, client):
        r = client.get(f"{BASE_URL}/api/master/locations", timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert isinstance(r.json(), list)

    def test_loans_expose_branch_location_fields(self, client):
        r = client.get(f"{BASE_URL}/api/loans", timeout=90)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        loans = body["loans"] if isinstance(body, dict) else body
        assert isinstance(loans, list)
        if loans:
            assert "_id" not in loans[0], "MongoDB _id leaked"
            assert "branch" in loans[0], "branch field missing on loan"
            assert "location" in loans[0], "location field missing on loan"

    def test_branch_location_persist_on_create(self, client):
        payload = {
            "agent_name": "Agent User", "customer_name": "TEST_FilterLoan",
            "company_name": "TEST_CO", "contact_no": "9999999999", "bank": "TEST BANK",
            "status": "Login", "month": "Apr-2026", "group_month": "Apr-2026",
            "branch": "TEST_BRANCH_X", "location": "TEST_LOC_Y",
        }
        cr = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert cr.status_code in (200, 201), cr.text[:300]
        loan_id = cr.json()["id"]
        try:
            g = client.get(f"{BASE_URL}/api/loans", timeout=90)
            assert g.status_code == 200
            gb = g.json()
            glist = gb["loans"] if isinstance(gb, dict) else gb
            match = [l for l in glist if l.get("id") == loan_id]
            assert match, "created loan not returned by GET /api/loans"
            assert match[0]["branch"] == "TEST_BRANCH_X"
            assert match[0]["location"] == "TEST_LOC_Y"
        finally:
            d = client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=60)
            assert d.status_code in (200, 204, 404)
