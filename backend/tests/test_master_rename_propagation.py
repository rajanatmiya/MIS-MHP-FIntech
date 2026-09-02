"""Tests: renaming a master entry propagates the new name into existing loan_applications.

Covers PUT /api/master/{customers,executives,managers,banks,agents,companies}/{id}
and verifies GET /api/loans reflects the new name for the mapped loan field.
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

# master collection -> loan field mapping
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
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def seed(client):
    """Create one loan using TEST_ master values; auto-sync creates master entries."""
    payload = {
        "agent_name": f"TEST_Agent_{SUF}",
        "customer_name": f"TEST_Cust_{SUF}",
        "company_name": f"TEST_Comp_{SUF}",
        "contact_no": "9998887771",
        "status": "Login",
        "bank": f"TEST_Bank_{SUF}",
        "executive_name": f"TEST_Exec_{SUF}",
        "team_manager": f"TEST_Mgr_{SUF}",
        "month": "Apr-2026",
        "group_month": "Apr-2026",
        "amount": "100000",
    }
    r = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Loan create failed {r.status_code}: {r.text[:400]}")
    loan_id = r.json()["id"]
    state = {"loan_id": loan_id, "payload": payload, "master_ids": {}}
    yield state
    # cleanup: delete loan + created master docs
    client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=30)
    for coll, mid in state["master_ids"].items():
        client.delete(f"{BASE_URL}/api/master/{coll}/{mid}", timeout=30)


def _get_loan(client, loan_id):
    r = client.get(f"{BASE_URL}/api/loans/{loan_id}", timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()


def _find_master(client, coll, name):
    r = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30)
    assert r.status_code == 200, r.text[:300]
    for item in r.json():
        if item.get("name") == name:
            return item
    return None


# --- Loan auto-sync created the master entries (pre-requisite) ---
@pytest.mark.parametrize("coll", list(MAPPING.keys()))
def test_master_entry_autocreated_from_loan(client, seed, coll):
    field = MAPPING[coll]
    name = seed["payload"][field]
    item = _find_master(client, coll, name)
    if coll == "agents":
        # agents are intentionally NOT auto-synced from loans (_sync_loan_to_master);
        # create the master agent explicitly so rename propagation can be tested.
        if item is None:
            r = client.post(f"{BASE_URL}/api/master/agents", json={"name": name}, timeout=30)
            assert r.status_code == 200, r.text[:300]
            item = r.json()
        seed["master_ids"][coll] = item["id"]
        return
    assert item is not None, f"Master {coll} entry '{name}' not auto-created from loan"
    seed["master_ids"][coll] = item["id"]


# --- Rename each master and verify propagation into the loan record ---
@pytest.mark.parametrize("coll", list(MAPPING.keys()))
def test_rename_propagates_to_loans(client, seed, coll):
    field = MAPPING[coll]
    old_name = seed["payload"][field]
    item = _find_master(client, coll, old_name) or {}
    mid = item.get("id") or seed["master_ids"].get(coll)
    assert mid, f"No master id for {coll}"
    seed["master_ids"][coll] = mid

    new_name = f"{old_name}_RENAMED"
    body = {"name": new_name}
    if coll == "customers":
        body["contact_no"] = "9998887771"
    r = client.put(f"{BASE_URL}/api/master/{coll}/{mid}", json=body, timeout=30)
    assert r.status_code == 200, f"PUT {coll} failed: {r.status_code} {r.text[:300]}"
    assert r.json()["name"] == new_name

    # master reflects new name
    assert _find_master(client, coll, new_name) is not None
    assert _find_master(client, coll, old_name) is None

    # loan record propagated
    loan = _get_loan(client, seed["loan_id"])
    assert loan[field] == new_name, (
        f"Loan field {field} not propagated: expected '{new_name}', got '{loan[field]}'"
    )

    # also verify via list endpoint (what MIS page consumes)
    lr = client.get(f"{BASE_URL}/api/loans", timeout=60)
    assert lr.status_code == 200, lr.text[:300]
    loans = lr.json()
    if isinstance(loans, dict):
        loans = loans.get("loans") or loans.get("data") or []
    stale = [x for x in loans if x.get(field) == old_name]
    assert not stale, f"{len(stale)} loans still hold old {field} '{old_name}'"

    # revert back to original name
    body2 = {"name": old_name}
    if coll == "customers":
        body2["contact_no"] = "9998887771"
    rv = client.put(f"{BASE_URL}/api/master/{coll}/{mid}", json=body2, timeout=30)
    assert rv.status_code == 200, rv.text[:300]
    loan = _get_loan(client, seed["loan_id"])
    assert loan[field] == old_name, f"Revert failed for {field}: got '{loan[field]}'"


# --- Non-admin cannot rename masters ---
def test_non_admin_cannot_rename(client, seed):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "agent@mhpfintech.com", "password": "Admin@123"}, timeout=30)
    if r.status_code != 200:
        pytest.skip("agent account unavailable")
    token = r.json().get("access_token") or r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    mid = seed["master_ids"].get("customers")
    if not mid:
        pytest.skip("no customer master id")
    resp = s.put(f"{BASE_URL}/api/master/customers/{mid}", json={"name": "TEST_Hack", "contact_no": "1"}, timeout=30)
    assert resp.status_code in (401, 403), f"Expected 403 got {resp.status_code}"


# --- Duplicate name rejected ---
def test_duplicate_rename_rejected(client, seed):
    mid = seed["master_ids"].get("banks")
    if not mid:
        pytest.skip("no bank master id")
    r = client.get(f"{BASE_URL}/api/master/banks", timeout=30)
    others = [b["name"] for b in r.json() if b["id"] != mid]
    if not others:
        pytest.skip("no other banks")
    resp = client.put(f"{BASE_URL}/api/master/banks/{mid}", json={"name": others[0]}, timeout=30)
    assert resp.status_code == 400, f"Expected 400 duplicate, got {resp.status_code}"


# --- BUG REPRO: loan values with surrounding whitespace / different case are NOT propagated ---
def test_rename_propagates_when_loan_value_has_whitespace(client):
    """Real preview data (e.g. customer 'Vishwa ') stores trailing spaces in loans while
    master stores the trimmed name. update_many uses exact equality so the rename is lost."""
    base_name = f"TEST_WS_Cust_{SUF}"
    payload = {
        "agent_name": "", "customer_name": f"{base_name} ", "company_name": "TEST_Co",
        "contact_no": "9998887772", "status": "Login", "bank": "SBI",
        "month": "Apr-2026", "group_month": "Apr-2026",
    }
    r = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=30)
    assert r.status_code == 200, r.text[:300]
    loan_id = r.json()["id"]
    # master entry created by sync will keep the raw value; create trimmed master explicitly
    m = client.post(f"{BASE_URL}/api/master/customers", json={"name": base_name, "contact_no": "9998887772"}, timeout=30)
    mid = m.json().get("id") if m.status_code == 200 else (_find_master(client, "customers", base_name) or {}).get("id")
    try:
        assert mid, f"could not create/find master customer: {m.text[:200]}"
        new_name = f"{base_name}_RENAMED"
        pr = client.put(f"{BASE_URL}/api/master/customers/{mid}", json={"name": new_name, "contact_no": "9998887772"}, timeout=30)
        assert pr.status_code == 200, pr.text[:300]
        loan = _get_loan(client, loan_id)
        assert loan["customer_name"].strip() == new_name, (
            f"Whitespace mismatch bug: loan customer_name is '{loan['customer_name']}' "
            f"after renaming master '{base_name}' -> '{new_name}'"
        )
    finally:
        client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=30)
        if mid:
            client.delete(f"{BASE_URL}/api/master/customers/{mid}", timeout=30)
        raw = _find_master(client, "customers", f"{base_name} ")
        if raw:
            client.delete(f"{BASE_URL}/api/master/customers/{raw['id']}", timeout=30)


# --- Unknown id returns 404 ---
def test_rename_unknown_id_404(client):
    resp = client.put(f"{BASE_URL}/api/master/customers/{uuid.uuid4()}", json={"name": f"TEST_NA_{SUF}", "contact_no": ""}, timeout=30)
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text[:200]}"
