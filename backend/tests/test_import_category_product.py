"""Excel import: Category / Product column mapping tests (bugfix verification)"""
import io
import os

import pytest
import requests
from dotenv import dotenv_values
from openpyxl import Workbook

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

TEST_MONTH = "Sep-2026"


def build_xlsx(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(list(r))
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@mhpfintech.com", "password": "Admin@123"})
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"No token in login response: {r.json()}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def get_month_loans(client, month=TEST_MONTH):
    r = client.get(f"{BASE_URL}/api/loans")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    loans = data if isinstance(data, list) else data.get("loans", [])
    return [l for l in loans if l.get("group_month") == month or l.get("month") == month]


@pytest.fixture(scope="module", autouse=True)
def cleanup(client):
    yield
    for loan in get_month_loans(client):
        client.delete(f"{BASE_URL}/api/loans/{loan['id']}")
    remaining = get_month_loans(client)
    assert remaining == [], f"Cleanup failed, {len(remaining)} loans left"


class TestCategoryProductImport:
    def test_standard_column_names(self, client):
        f = build_xlsx(
            ["Customer Name", "Status", "Bank", "Category", "Product"],
            [("TEST_User A", "Pending", "SBI", "SECURED", "Home Loan"),
             ("TEST_User B", "Approved", "ICICI", "UNSECURED", "Personal Loan")],
        )
        r = client.post(
            f"{BASE_URL}/api/import/loans-excel",
            files={"file": ("cat_prod.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"month": TEST_MONTH},
        )
        assert r.status_code == 200, r.text[:500]
        body = r.json()
        assert body.get("imported") == 2, body

        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        assert "TEST_User A" in loans and "TEST_User B" in loans, list(loans)
        a, b = loans["TEST_User A"], loans["TEST_User B"]
        assert a["category"] == "SECURED", a
        assert a["product"] == "Home Loan", a
        assert a["bank"] == "SBI"
        assert a["status"] == "Pending"
        assert b["category"] == "UNSECURED", b
        assert b["product"] == "Personal Loan", b
        assert b["status"] == "Approved"

    def test_alternate_column_names(self, client):
        f = build_xlsx(
            ["Customer Name", "Bank", "Loan Category", "Product Type"],
            [("TEST_User C", "HDFC Bank", "SECURED", "LAP")],
        )
        r = client.post(
            f"{BASE_URL}/api/import/loans-excel",
            files={"file": ("alt.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"month": TEST_MONTH},
        )
        assert r.status_code == 200, r.text[:500]
        assert r.json().get("imported") == 1, r.json()

        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        c = loans.get("TEST_User C")
        assert c is not None, list(loans)
        assert c["category"] == "SECURED", c
        assert c["product"] == "LAP", c

    def test_loan_product_alias(self, client):
        f = build_xlsx(
            ["Customer Name", "Bank", "Category", "Loan Product"],
            [("TEST_User D", "SBI", "UNSECURED", "Business Loan")],
        )
        r = client.post(
            f"{BASE_URL}/api/import/loans-excel",
            files={"file": ("alias.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"month": TEST_MONTH},
        )
        assert r.status_code == 200, r.text[:500]
        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        d = loans.get("TEST_User D")
        assert d is not None, list(loans)
        assert d["category"] == "UNSECURED", d
        assert d["product"] == "Business Loan", d
