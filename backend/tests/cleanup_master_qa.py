"""Cleanup script: removes QA-created master names via admin API."""
import os

import requests
from dotenv import dotenv_values

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
PREFIXES = ("TestMgr", "TestAgent", "TEST_", "MgrTest")
RESOURCES = ["customers", "companies", "executives", "managers"]

r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"}, timeout=30)
r.raise_for_status()
tok = r.json().get("access_token") or r.json().get("token")
h = {"Authorization": f"Bearer {tok}"}

for res in RESOURCES:
    items = requests.get(f"{BASE_URL}/api/master/{res}", headers=h, timeout=30).json()
    for it in items:
        if it["name"].startswith(PREFIXES):
            d = requests.delete(f"{BASE_URL}/api/master/{res}/{it['id']}", headers=h, timeout=30)
            print(res, it["name"], d.status_code)
print("cleanup done")
