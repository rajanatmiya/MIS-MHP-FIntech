"""Excel import: fuzzy column matching for Category/Product + full-column import (iteration 38)"""
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
    body = r.json()
    token = body.get("access_token") or body.get("token")
    assert token, f"No token: {body}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def get_month_loans(client, month=TEST_MONTH):
    r = client.get(f"{BASE_URL}/api/loans")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    loans = data if isinstance(data, list) else data.get("loans", [])
    return [l for l in loans if l.get("group_month") == month or l.get("month") == month]


def do_import(client, f, name="t.xlsx"):
    return client.post(
        f"{BASE_URL}/api/import/loans-excel",
        files={"file": (name, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"month": TEST_MONTH},
    )


@pytest.fixture(scope="module", autouse=True)
def cleanup(client):
    yield
    for loan in get_month_loans(client):
        client.delete(f"{BASE_URL}/api/loans/{loan['id']}")
    remaining = get_month_loans(client)
    assert remaining == [], f"Cleanup failed, {len(remaining)} left"


class TestFullColumnImport:
    """Full column set as described in the review request"""

    def test_full_columns_import(self, client):
        f = build_xlsx(
            ["Customer Name", "Contact No", "Bank", "Category", "Product", "Status", "Amount"],
            [("TEST_Full One", 9876543210, "SBI", "SECURED", "Home Loan", "Approved", 500000),
             ("TEST_Full Two", 9123456780, "HDFC Bank", "UNSECURED", "Personal Loan", "Pending", 250000)],
        )
        r = do_import(client, f, "full.xlsx")
        assert r.status_code == 200, r.text[:500]
        assert r.json().get("imported") == 2, r.json()

        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        one = loans.get("TEST_Full One")
        assert one is not None, list(loans)
        assert one["category"] == "SECURED", one
        assert one["product"] == "Home Loan", one
        assert one["bank"] == "SBI", one
        assert one["status"] == "Approved", one
        assert one["contact_no"] == "9876543210", one
        assert float(one["amount"]) == 500000.0, one

        two = loans.get("TEST_Full Two")
        assert two is not None, list(loans)
        assert two["category"] == "UNSECURED", two
        assert two["product"] == "Personal Loan", two
        assert two["status"] == "Pending", two


class TestFuzzyColumnMatching:
    def test_cat_prod_short_headers(self, client):
        f = build_xlsx(
            ["Customer Name", "Bank", "Cat", "Prod"],
            [("TEST_Fuzzy One", "ICICI", "SECURED", "LAP")],
        )
        r = do_import(client, f, "fuzzy.xlsx")
        assert r.status_code == 200, r.text[:500]
        assert r.json().get("imported") == 1, r.json()

        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        x = loans.get("TEST_Fuzzy One")
        assert x is not None, list(loans)
        assert x["category"] == "SECURED", f"fuzzy 'Cat' not mapped to category: {x}"
        assert x["product"] == "LAP", f"fuzzy 'Prod' not mapped to product: {x}"

    def test_verbose_fuzzy_headers(self, client):
        f = build_xlsx(
            ["Cust Name", "Bank", "Loan Cat Type", "Prod Name"],
            [("TEST_Fuzzy Two", "SBI", "UNSECURED", "Business Loan")],
        )
        r = do_import(client, f, "fuzzy2.xlsx")
        assert r.status_code == 200, r.text[:500]
        assert r.json().get("imported") == 1, r.json()

        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        x = loans.get("TEST_Fuzzy Two")
        assert x is not None, f"fuzzy 'Cust Name' not mapped to customer_name; loans={list(loans)}"
        assert x["category"] == "UNSECURED", x
        assert x["product"] == "Business Loan", x


class TestImportEdgeCases:
    def test_blank_category_product_cells(self, client):
        f = build_xlsx(
            ["Customer Name", "Bank", "Category", "Product"],
            [("TEST_Blank One", "SBI", None, None)],
        )
        r = do_import(client, f, "blank.xlsx")
        assert r.status_code == 200, r.text[:500]
        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        x = loans.get("TEST_Blank One")
        assert x is not None, list(loans)
        assert x.get("category") in ("", None), x
        assert x.get("product") in ("", None), x

    def test_missing_category_product_columns(self, client):
        f = build_xlsx(
            ["Customer Name", "Bank", "Status"],
            [("TEST_NoCols One", "SBI", "Pending")],
        )
        r = do_import(client, f, "nocols.xlsx")
        assert r.status_code == 200, r.text[:500]
        loans = {l["customer_name"]: l for l in get_month_loans(client)}
        x = loans.get("TEST_NoCols One")
        assert x is not None, list(loans)
        assert x.get("category") in ("", None), x
        assert x.get("product") in ("", None), x
