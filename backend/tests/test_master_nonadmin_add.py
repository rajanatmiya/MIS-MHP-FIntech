"""Tests: non-admin (manager) can POST master names; PUT/DELETE remain admin-only."""
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

SUFFIX = uuid.uuid4().hex[:6]
RESOURCES = ["customers", "companies", "executives", "managers"]


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text[:300]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"no token in {data}"
    return token


@pytest.fixture(scope="module")
def manager_token():
    return _login("manager@mhpfintech.com", "Admin@123")


@pytest.fixture(scope="module")
def agent_token():
    return _login("agent@mhpfintech.com", "Admin@123")


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin@mhpfintech.com", "Admin@123")


@pytest.fixture(scope="module")
def created(admin_token):
    """Track created ids: list of (resource, id) - cleaned via admin delete."""
    items = []
    yield items
    h = {"Authorization": f"Bearer {admin_token}"}
    for res, item_id in items:
        requests.delete(f"{BASE_URL}/api/master/{res}/{item_id}", headers=h, timeout=30)


@pytest.mark.parametrize("resource", RESOURCES)
def test_manager_can_add_master_name(resource, manager_token, admin_token, created):
    h = {"Authorization": f"Bearer {manager_token}"}
    name = f"TEST_Mgr_{resource}_{SUFFIX}"
    payload = {"name": name}
    if resource == "customers":
        payload["contact_no"] = "9990001111"
    r = requests.post(f"{BASE_URL}/api/master/{resource}", json=payload, headers=h, timeout=30)
    assert r.status_code == 200, f"POST {resource} -> {r.status_code}: {r.text[:300]}"
    doc = r.json()
    assert doc.get("name") == name
    assert isinstance(doc.get("id"), str) and doc["id"]
    assert "_id" not in doc
    if resource == "customers":
        assert doc.get("contact_no") == "9990001111"
    created.append((resource, doc["id"]))

    # Verify persistence and admin visibility
    g = requests.get(f"{BASE_URL}/api/master/{resource}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
    assert g.status_code == 200
    names = [x["name"] for x in g.json()]
    assert name in names, f"{name} not visible to admin in {resource}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_manager_duplicate_rejected(resource, manager_token, created):
    existing = [i for r, i in created if r == resource]
    if not existing:
        pytest.skip("no created item")
    h = {"Authorization": f"Bearer {manager_token}"}
    name = f"TEST_Mgr_{resource}_{SUFFIX}"
    r = requests.post(f"{BASE_URL}/api/master/{resource}", json={"name": name}, headers=h, timeout=30)
    assert r.status_code == 400, f"expected 400 duplicate, got {r.status_code}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_manager_empty_name_rejected(resource, manager_token):
    h = {"Authorization": f"Bearer {manager_token}"}
    r = requests.post(f"{BASE_URL}/api/master/{resource}", json={"name": "   "}, headers=h, timeout=30)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_agent_can_add_master_name(resource, agent_token, created):
    h = {"Authorization": f"Bearer {agent_token}"}
    name = f"TEST_Agent_{resource}_{SUFFIX}"
    r = requests.post(f"{BASE_URL}/api/master/{resource}", json={"name": name}, headers=h, timeout=30)
    assert r.status_code == 200, f"POST {resource} as agent -> {r.status_code}: {r.text[:300]}"
    created.append((resource, r.json()["id"]))


@pytest.mark.parametrize("resource", RESOURCES)
def test_manager_cannot_update(resource, manager_token, created):
    ids = [i for r, i in created if r == resource]
    if not ids:
        pytest.skip("no created item")
    h = {"Authorization": f"Bearer {manager_token}"}
    r = requests.put(f"{BASE_URL}/api/master/{resource}/{ids[0]}", json={"name": "TEST_Hacked"}, headers=h, timeout=30)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_manager_cannot_delete(resource, manager_token, created):
    ids = [i for r, i in created if r == resource]
    if not ids:
        pytest.skip("no created item")
    h = {"Authorization": f"Bearer {manager_token}"}
    r = requests.delete(f"{BASE_URL}/api/master/{resource}/{ids[0]}", headers=h, timeout=30)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_unauthenticated_rejected(resource):
    r = requests.post(f"{BASE_URL}/api/master/{resource}", json={"name": "TEST_NoAuth"}, timeout=30)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


@pytest.mark.parametrize("resource", RESOURCES)
def test_admin_can_update_and_delete(resource, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    name = f"TEST_AdminCRUD_{resource}_{SUFFIX}"
    c = requests.post(f"{BASE_URL}/api/master/{resource}", json={"name": name}, headers=h, timeout=30)
    assert c.status_code == 200, c.text[:300]
    item_id = c.json()["id"]
    u = requests.put(f"{BASE_URL}/api/master/{resource}/{item_id}", json={"name": name + "_upd"}, headers=h, timeout=30)
    assert u.status_code == 200, u.text[:300]
    g = requests.get(f"{BASE_URL}/api/master/{resource}", headers=h, timeout=30)
    assert (name + "_upd") in [x["name"] for x in g.json()]
    d = requests.delete(f"{BASE_URL}/api/master/{resource}/{item_id}", headers=h, timeout=30)
    assert d.status_code == 200, d.text[:300]
    g2 = requests.get(f"{BASE_URL}/api/master/{resource}", headers=h, timeout=30)
    assert (name + "_upd") not in [x["name"] for x in g2.json()]
