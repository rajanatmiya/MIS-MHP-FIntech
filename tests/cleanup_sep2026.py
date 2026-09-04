import os
import requests
from dotenv import dotenv_values

env = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or env["REACT_APP_BACKEND_URL"]).rstrip("/")
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
r.raise_for_status()
s.headers.update({"Authorization": f"Bearer {r.json().get('access_token') or r.json().get('token')}"})
data = s.get(f"{BASE}/api/loans?limit=2000").json()
loans = data if isinstance(data, list) else data.get("loans", [])
targets = [l for l in loans if (l.get("group_month") == "Sep-2026" or l.get("month") == "Sep-2026")]
print("to delete:", [(l["customer_name"], l["id"]) for l in targets])
for l in targets:
    d = s.delete(f"{BASE}/api/loans/{l['id']}")
    print(l["customer_name"], d.status_code)
data = s.get(f"{BASE}/api/loans?limit=2000").json()
loans = data if isinstance(data, list) else data.get("loans", [])
left = [l for l in loans if (l.get("group_month") == "Sep-2026" or l.get("month") == "Sep-2026")]
print("remaining Sep-2026:", len(left), "total loans:", len(loans))
