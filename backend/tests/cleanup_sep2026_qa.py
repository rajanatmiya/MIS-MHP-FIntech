"""Cleanup script: remove QA test loans in Sep-2026 / Sep'26 month groups"""
import os

import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")

s = requests.Session()
r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
r.raise_for_status()
body = r.json()
s.headers.update({"Authorization": f"Bearer {body.get('access_token') or body.get('token')}"})

r = s.get(f"{BASE_URL}/api/loans")
r.raise_for_status()
data = r.json()
loans = data if isinstance(data, list) else data.get("loans", [])
targets = [l for l in loans if (l.get("group_month") in ("Sep-2026", "Sep'26")) and str(l.get("customer_name", "")).startswith("TEST_")]
print(f"Found {len(targets)} test loans to delete")
for l in targets:
    d = s.delete(f"{BASE_URL}/api/loans/{l['id']}")
    print(l.get("customer_name"), l.get("group_month"), d.status_code)

r = s.get(f"{BASE_URL}/api/loans")
loans = r.json() if isinstance(r.json(), list) else r.json().get("loans", [])
left = [l for l in loans if l.get("group_month") in ("Sep-2026", "Sep'26")]
print("Remaining Sep loans:", [(l.get("customer_name"), l.get("category"), l.get("product")) for l in left])
