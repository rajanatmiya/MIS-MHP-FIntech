"""Seed / cleanup Apr-2026 loans with known amounts for MIS filter-totals testing."""
import sys
import requests
from dotenv import dotenv_values

BASE = (dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL")).rstrip("/")
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
tok = r.json().get("access_token") or r.json().get("token")
s.headers.update({"Authorization": f"Bearer {tok}"})

SEEDS = [
    dict(customer_name="TEST_QA_A", bank="HDFC Bank", status="Disbursed", company_name="TEST_QA_Co1",
         team_manager="TEST_QA_Mgr1", executive_name="TEST_QA_Exec1", sanction="1000000", disbursed="900000"),
    dict(customer_name="TEST_QA_B", bank="HDFC Bank", status="Hold", company_name="TEST_QA_Co1",
         team_manager="TEST_QA_Mgr1", executive_name="TEST_QA_Exec2", sanction="2000000", disbursed="1500000"),
    dict(customer_name="TEST_QA_C", bank="ICICI", status="Disbursed", company_name="TEST_QA_Co2",
         team_manager="TEST_QA_Mgr2", executive_name="TEST_QA_Exec1", sanction="3000000", disbursed="2500000"),
    dict(customer_name="TEST_QA_D", bank="SBI", status="Hold", company_name="TEST_QA_Co2",
         team_manager="TEST_QA_Mgr2", executive_name="TEST_QA_Exec2", sanction="4000000", disbursed="0"),
]


def seed():
    for sd in SEEDS:
        payload = {**sd, "month": "15-04-2026", "contact_no": "9000000000", "agent_name": "QA Agent",
                   "category": "UNSECURED", "product": "Business Loan"}
        resp = s.post(f"{BASE}/api/loans", json=payload)
        print(sd["customer_name"], resp.status_code, resp.text[:200] if resp.status_code >= 400 else resp.json()["id"])


def cleanup():
    data = s.get(f"{BASE}/api/loans", params={"limit": 1000}).json()["loans"]
    for l in data:
        if str(l.get("customer_name", "")).startswith("TEST_QA_"):
            r2 = s.delete(f"{BASE}/api/loans/{l['id']}")
            print("deleted", l["customer_name"], r2.status_code)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        cleanup()
    else:
        seed()
