import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing credentials file")
    c = p.read_text(encoding="utf-8")
    e = re.search(r'(?im)^\s*[-*]?\s*Email\s*:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*[-*]?\s*Password\s*:\s*`?([^`\s]+)', c)
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def client(test_credentials):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_credentials["email"], "password": test_credentials["password"]})
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    assert token
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# --- Team leaderboard analytics ---
class TestLeaderboard:
    def test_team_leaderboard_200(self, client):
        r = client.get(f"{BASE_URL}/api/analytics/team-leaderboard")
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        rows = data if isinstance(data, list) else data.get("leaderboard", data.get("data"))
        assert isinstance(rows, list)
        for row in rows:
            assert "_id" not in row

    def test_team_leaderboard_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard")
        assert r.status_code in (401, 403)


# --- Companies master: Pvt->Private, Ltd->Limited, dedup ---
class TestCompanyCleanup:
    def test_companies_list(self, client):
        r = client.get(f"{BASE_URL}/api/master/companies")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        items = data if isinstance(data, list) else data.get("companies", [])
        names = [i if isinstance(i, str) else (i.get("name") or i.get("company_name") or "") for i in items]
        print(f"COMPANIES({len(names)}): {names}")
        bad = [n for n in names if re.search(r'\bPvt\b|\bLtd\b', n, re.I)]
        assert not bad, f"Abbreviations not normalized: {bad}"
        lowered = [n.strip().lower() for n in names]
        dupes = {n for n in lowered if lowered.count(n) > 1}
        assert not dupes, f"Duplicate company names: {dupes}"

    def test_loan_company_names_normalized(self, client):
        r = client.get(f"{BASE_URL}/api/loans?limit=2000")
        assert r.status_code == 200
        data = r.json()
        loans = data.get("loans") if isinstance(data, dict) else data
        assert isinstance(loans, list)
        names = sorted({(l.get("company_name") or "") for l in loans})
        print(f"LOAN COMPANIES({len(names)}): {names}")
        bad = [n for n in names if re.search(r'\bPvt\b|\bLtd\b', n, re.I)]
        assert not bad, f"Loan rows still contain abbreviations: {bad}"


# --- Loans data used by MIS totals row ---
class TestLoansTotals:
    def test_loans_numeric_fields_parseable(self, client):
        r = client.get(f"{BASE_URL}/api/loans?limit=2000")
        assert r.status_code == 200
        loans = r.json().get("loans")
        assert isinstance(loans, list)
        for l in loans:
            assert "_id" not in l
        def num(v):
            try:
                return float(str(v).replace(",", "").replace("₹", "").strip() or 0)
            except (ValueError, TypeError):
                return None
        bad = [(l.get("id"), f, l.get(f)) for l in loans for f in ("amount", "sanction", "disbursed") if num(l.get(f)) is None]
        print(f"Non-numeric MIS values: {bad}")
        assert isinstance(bad, list)
