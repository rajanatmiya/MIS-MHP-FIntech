"""Cleanup QA data created by test_import_group_month / UI import test."""
import os
import requests
from dotenv import dotenv_values

env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or env["REACT_APP_BACKEND_URL"]).rstrip("/")
PREFIXES = ("TEST_UI_Import_", "TEST_IMP_")

s = requests.Session()
r = s.post(f"{BASE_URL}/api/auth/login",
           json={"email": "admin@mhpfintech.com", "password": "Admin@123"}, timeout=60)
r.raise_for_status()
s.headers["Authorization"] = f"Bearer {r.json().get('access_token') or r.json().get('token')}"

body = s.get(f"{BASE_URL}/api/loans", params={"limit": 2000}, timeout=120).json()
loans = body["loans"] if isinstance(body, dict) else body
removed = 0
for loan in loans:
    name = loan.get("customer_name") or ""
    if name.startswith(PREFIXES):
        d = s.delete(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
        print(name, d.status_code)
        removed += 1
print("removed", removed)
