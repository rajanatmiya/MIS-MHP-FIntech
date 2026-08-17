"""Remove TEST_QA_* master entries created by loan auto-sync during MIS filter-totals QA."""
import requests
from dotenv import dotenv_values

BASE = (dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL")).rstrip("/")
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
tok = r.json().get("access_token") or r.json().get("token")
s.headers.update({"Authorization": f"Bearer {tok}"})

for coll in ["customers", "companies", "executives", "managers"]:
    resp = s.get(f"{BASE}/api/master/{coll}")
    if resp.status_code != 200:
        print(coll, "GET", resp.status_code)
        continue
    items = resp.json()
    items = items if isinstance(items, list) else items.get(coll, [])
    for it in items:
        if str(it.get("name", "")).startswith("TEST_QA_") or it.get("name") == "QA Agent":
            d = s.delete(f"{BASE}/api/master/{coll}/{it['id']}")
            print("deleted", coll, it["name"], d.status_code)
