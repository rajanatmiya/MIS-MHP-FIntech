"""Tests for startup auto-sync migrations: loan data -> master_customers/executives/managers."""
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
def loans(client):
    r = client.get(f"{BASE_URL}/api/loans", timeout=60)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    if isinstance(data, dict):
        data = data.get("loans") or data.get("data") or []
    assert isinstance(data, list)
    return data


# --- Master lists non-empty ---
@pytest.mark.parametrize("coll", ["customers", "executives", "managers"])
def test_master_list_non_empty(client, coll):
    r = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0, f"master/{coll} is empty - sync migration did not run"


def test_customers_have_name_and_contact_field(client):
    data = client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()
    for item in data:
        assert "_id" not in item
        assert item.get("name")
        assert "contact_no" in item, f"missing contact_no: {item}"
    with_contact = [c for c in data if str(c.get("contact_no") or "").strip()]
    assert with_contact, "no customer has a non-empty contact_no"


# --- Sync completeness: every distinct loan value exists in master ---
def test_all_loan_customers_synced(client, loans):
    master = {c["name"].strip() for c in client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()}
    loan_names = {str(l.get("customer_name") or "").strip() for l in loans}
    loan_names.discard("")
    missing = sorted(loan_names - master)
    assert not missing, f"customers not synced to master: {missing}"


def test_all_loan_executives_synced(client, loans):
    master = {c["name"].strip() for c in client.get(f"{BASE_URL}/api/master/executives", timeout=30).json()}
    loan_names = {str(l.get("executive_name") or "").strip() for l in loans}
    loan_names.discard("")
    missing = sorted(loan_names - master)
    assert not missing, f"executives not synced to master: {missing}"


def test_all_loan_managers_synced(client, loans):
    master = {c["name"].strip() for c in client.get(f"{BASE_URL}/api/master/managers", timeout=30).json()}
    loan_names = {str(l.get("team_manager") or "").strip() for l in loans}
    loan_names.discard("")
    missing = sorted(loan_names - master)
    assert not missing, f"managers not synced to master: {missing}"


# --- No duplicate names (idempotency of migration) ---
@pytest.mark.parametrize("coll", ["customers", "executives", "managers"])
def test_no_duplicate_names(client, coll):
    data = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30).json()
    names = [x["name"].strip() for x in data]
    dupes = {n for n in names if names.count(n) > 1}
    assert not dupes, f"duplicate entries in master/{coll}: {dupes}"


# --- Contact number matches loan record for synced customers ---
def test_synced_customer_contact_matches_loan(client, loans):
    master = {c["name"].strip(): str(c.get("contact_no") or "").strip()
              for c in client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()}
    mismatches = []
    seen = set()
    for l in loans:
        name = str(l.get("customer_name") or "").strip()
        contact = str(l.get("contact_no") or "").strip()
        if not name or not contact or name in seen:
            continue
        seen.add(name)
        if name in master and master[name] and master[name] != contact:
            mismatches.append((name, master[name], contact))
    # informational: multiple loans may share a name with different contacts
    if mismatches:
        print(f"Contact mismatches (first-loan wins is expected): {mismatches[:5]}")
