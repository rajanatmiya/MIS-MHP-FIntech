"""Cleanup helper: removes TEST_QA_* data created during frontend testing of MonthlyMIS inline-add."""
import os
import requests
from dotenv import dotenv_values

BASE = (dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL") or "").rstrip("/")
EMAIL = "admin@mhpfintech.com"
PASSWORD = "Admin@123"


def main():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})

    loans = s.get(f"{BASE}/api/loans").json()
    loans = loans if isinstance(loans, list) else loans.get("loans", [])
    for l in loans:
        if str(l.get("company_name", "")).startswith("TEST_QA"):
            print("delete loan", l["id"], s.delete(f"{BASE}/api/loans/{l['id']}").status_code)

    for res in ("customers", "executives", "managers"):
        items = s.get(f"{BASE}/api/master/{res}").json()
        for it in items:
            if str(it.get("name", "")).startswith("TEST_QA"):
                print("delete", res, it["name"], s.delete(f"{BASE}/api/master/{res}/{it['id']}").status_code)


if __name__ == "__main__":
    main()
