"""Tests for new Master File sections: customers (with contact_no), executives, managers."""
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
def cleanup(client):
    created = {"customers": [], "executives": [], "managers": []}
    yield created
    for coll, ids in created.items():
        for i in ids:
            client.delete(f"{BASE_URL}/api/master/{coll}/{i}", timeout=30)


# --- GET endpoints return arrays ---
@pytest.mark.parametrize("coll", ["customers", "executives", "managers"])
def test_get_returns_array(client, coll):
    r = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, list)
    for item in data:
        assert "_id" not in item
        assert "id" in item and "name" in item


# --- Customer CRUD with contact_no ---
def test_customer_create_persist_update_delete(client, cleanup):
    payload = {"name": "TEST_Cust_QA", "contact_no": "9998887770"}
    client.request("DELETE", f"{BASE_URL}/api/master/customers/none", timeout=10)
    r = client.post(f"{BASE_URL}/api/master/customers", json=payload, timeout=30)
    assert r.status_code == 200, r.text[:300]
    doc = r.json()
    assert doc["name"] == payload["name"]
    assert doc["contact_no"] == payload["contact_no"]
    cid = doc["id"]
    cleanup["customers"].append(cid)

    lst = client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()
    found = [x for x in lst if x["id"] == cid]
    assert found, "created customer not persisted"
    assert found[0]["contact_no"] == "9998887770"

    # duplicate rejected
    dup = client.post(f"{BASE_URL}/api/master/customers", json=payload, timeout=30)
    assert dup.status_code == 400

    # update
    up = client.put(f"{BASE_URL}/api/master/customers/{cid}",
                    json={"name": "TEST_Cust_QA2", "contact_no": "9111111111"}, timeout=30)
    assert up.status_code == 200, up.text[:300]
    lst = client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()
    found = [x for x in lst if x["id"] == cid][0]
    assert found["name"] == "TEST_Cust_QA2"
    assert found["contact_no"] == "9111111111"

    # delete
    d = client.delete(f"{BASE_URL}/api/master/customers/{cid}", timeout=30)
    assert d.status_code == 200
    lst = client.get(f"{BASE_URL}/api/master/customers", timeout=30).json()
    assert not [x for x in lst if x["id"] == cid]
    cleanup["customers"].remove(cid)


def test_customer_missing_name_400(client):
    r = client.post(f"{BASE_URL}/api/master/customers", json={"name": "  ", "contact_no": "1"}, timeout=30)
    assert r.status_code == 400


# --- Executives / Managers CRUD ---
@pytest.mark.parametrize("coll,label", [("executives", "TEST_Exec_QA"), ("managers", "TEST_Mgr_QA")])
def test_simple_master_crud(client, cleanup, coll, label):
    r = client.post(f"{BASE_URL}/api/master/{coll}", json={"name": label}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    doc = r.json()
    assert doc["name"] == label
    item_id = doc["id"]
    cleanup[coll].append(item_id)

    lst = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30).json()
    assert [x for x in lst if x["id"] == item_id]

    dup = client.post(f"{BASE_URL}/api/master/{coll}", json={"name": label}, timeout=30)
    assert dup.status_code == 400

    up = client.put(f"{BASE_URL}/api/master/{coll}/{item_id}", json={"name": label + "_U"}, timeout=30)
    assert up.status_code == 200
    lst = client.get(f"{BASE_URL}/api/master/{coll}", timeout=30).json()
    assert [x for x in lst if x["id"] == item_id][0]["name"] == label + "_U"

    d = client.delete(f"{BASE_URL}/api/master/{coll}/{item_id}", timeout=30)
    assert d.status_code == 200
    cleanup[coll].remove(item_id)
    nf = client.delete(f"{BASE_URL}/api/master/{coll}/{item_id}", timeout=30)
    assert nf.status_code == 404


# --- Auth required ---
@pytest.mark.parametrize("coll", ["customers", "executives", "managers"])
def test_requires_auth(coll):
    r = requests.get(f"{BASE_URL}/api/master/{coll}", timeout=30)
    assert r.status_code in (401, 403)
