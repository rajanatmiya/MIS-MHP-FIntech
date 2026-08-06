"""Tests for v3 clean-replace seed of master managers & executives."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

EXPECTED_MANAGERS = sorted([
    "Akash Parmar", "Ankit Shah", "Bhavesh Lakhotiya", "Hiren Parmar", "Karan Mehta",
    "Komal Gupta", "Kunal Trivedi", "Priya Mistry", "Sumeet Gosavi",
])
STALE_NAMES = {"Dimple", "Manager One", "Rajan", "Exec One"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


class TestMasterManagers:
    def test_managers_exact_nine(self, client):
        r = client.get(f"{BASE_URL}/api/master/managers")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        names = [d["name"] for d in data]
        assert len(names) == 9, f"Expected 9 managers, got {len(names)}: {names}"
        assert sorted(names) == EXPECTED_MANAGERS, f"Mismatch: {sorted(names)}"
        assert len(set(names)) == len(names), "Duplicate manager names"
        assert not any(n in STALE_NAMES for n in names)
        assert all("_id" not in d for d in data), "_id leaked in response"


class TestMasterExecutives:
    def test_executives_exact_84(self, client):
        r = client.get(f"{BASE_URL}/api/master/executives")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        names = [d["name"] for d in data]
        assert len(names) == 84, f"Expected 84 executives, got {len(names)}"
        assert len(set(names)) == len(names), f"Duplicates: {[n for n in names if names.count(n) > 1]}"
        assert not any(n in STALE_NAMES for n in names), f"Stale names present: {[n for n in names if n in STALE_NAMES]}"
        for m in EXPECTED_MANAGERS:
            assert m in names, f"Manager {m} missing from executives"
        assert all("_id" not in d for d in data)

    def test_unauthenticated_rejected(self):
        r = requests.get(f"{BASE_URL}/api/master/executives")
        assert r.status_code in (401, 403), r.status_code
