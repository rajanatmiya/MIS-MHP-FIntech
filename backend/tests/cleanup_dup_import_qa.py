"""Cleanup: remove TestDupA/TestDupB loans created during duplicate-import QA."""
import os

import requests
from dotenv import dotenv_values

env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or env["REACT_APP_BACKEND_URL"]).rstrip("/")
NAMES = {"TestDupA", "TestDupB"}

s = requests.Session()
r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"}, timeout=60)
r.raise_for_status()
s.headers.update({"Authorization": f"Bearer {r.json().get('access_token') or r.json().get('token')}"})

r = s.get(f"{BASE_URL}/api/loans?limit=2000", timeout=120)
loans = r.json().get("loans", r.json()) if isinstance(r.json(), dict) else r.json()
deleted = 0
for loan in loans:
    if loan.get("customer_name") in NAMES:
        d = s.delete(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)
        deleted += 1 if d.status_code in (200, 204) else 0

r = s.get(f"{BASE_URL}/api/loans?limit=2000", timeout=120)
loans = r.json().get("loans", r.json()) if isinstance(r.json(), dict) else r.json()
remaining = [x for x in loans if x.get("customer_name") in NAMES]
print(f"deleted={deleted} remaining={len(remaining)}")
