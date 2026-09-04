"""Tests for Excel import NaN handling + full column mapping (safe_str fix)."""
import io
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values
from openpyxl import Workbook

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

MONTH = "Dec'99"
PREFIX = "TESTNAN_"


@pytest.fixture(scope="module")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    email = re.search(r"Email:\s*(\S+)", content).group(1)
    password = re.search(r"Password:\s*(\S+)", content).group(1)
    return {"email": email, "password": password}


@pytest.fixture(scope="module")
def client(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


def _xlsx(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _import(client, buf, month=MONTH):
    return client.post(
        f"{BASE_URL}/api/import/loans-excel",
        files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"month": month},
        timeout=120,
    )


def _fetch(client, month=MONTH):
    r = client.get(f"{BASE_URL}/api/loans", params={"month": month, "limit": 500}, timeout=60)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    loans = data.get("loans", data) if isinstance(data, dict) else data
    return [l for l in loans if str(l.get("customer_name", "")).startswith(PREFIX)
            or str(l.get("company_name", "")).startswith(PREFIX)
            or str(l.get("remark", "")).startswith(PREFIX)]


@pytest.fixture(scope="module")
def created_ids():
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(client, created_ids):
    yield
    for lid in created_ids:
        client.delete(f"{BASE_URL}/api/loans/{lid}", timeout=60)


class TestNaNImport:
    def test_empty_cells_not_nan(self, client, created_ids):
        headers = ["Customer Name", "Company", "Contact No", "Bank", "Status", "Remark"]
        rows = [
            [None, "TESTNAN_Co1", "9990000001", "SBI", "Login", "TESTNAN_r1"],
            ["TESTNAN_Cust2", "TESTNAN_Co2", None, "HDFC Bank", "Sanction", "TESTNAN_r2"],
            ["TESTNAN_Cust3", "TESTNAN_Co3", "9990000003", "SBI", None, "TESTNAN_r3"],
        ]
        r = _import(client, _xlsx(headers, rows))
        assert r.status_code == 200, r.text[:500]
        body = r.json()
        assert body["imported"] == 3, body

        loans = _fetch(client)
        created_ids.extend([l["id"] for l in loans])
        assert len(loans) >= 3, f"expected 3 loans, got {len(loans)}"

        bad = []
        for l in loans:
            for k, v in l.items():
                if isinstance(v, str) and v.strip().lower() in ("nan", "nat", "none"):
                    bad.append((l.get("remark"), k, v))
        assert not bad, f"Fields containing nan/nat/none: {bad}"

        by_remark = {l["remark"]: l for l in loans}
        assert by_remark["TESTNAN_r1"]["customer_name"] == ""
        assert by_remark["TESTNAN_r2"]["contact_no"] == ""
        # empty status defaults to Pending
        assert by_remark["TESTNAN_r3"]["status"] == "Pending"

    def test_all_columns_mapped(self, client, created_ids):
        headers = ["Customer Name", "Company", "Contact No", "Bank", "Status", "Category",
                   "Product", "Amount", "Sanction", "Disbursed", "Login Date", "Location",
                   "Branch", "Executive", "Manager", "Remark"]
        row = ["TESTNAN_Full", "TESTNAN_FullCo", "9998887776", "SBI", "Disbursed", "SECURED",
               "Home Loan", "5000000", "4800000", "4500000", "2026-01-15", "Mumbai",
               "Andheri", "Exec One", "Mgr One", "TESTNAN_full"]
        r = _import(client, _xlsx(headers, [row]))
        assert r.status_code == 200, r.text[:500]
        assert r.json()["imported"] == 1, r.json()

        loans = _fetch(client)
        created_ids.extend([l["id"] for l in loans if l["id"] not in created_ids])
        full = [l for l in loans if l.get("remark") == "TESTNAN_full"]
        assert len(full) == 1, "full-column row not found"
        l = full[0]
        expected = {
            "customer_name": "TESTNAN_Full",
            "company_name": "TESTNAN_FullCo",
            "contact_no": "9998887776",
            "bank": "SBI",
            "status": "Disbursed",
            "category": "SECURED",
            "product": "Home Loan",
            "location": "Mumbai",
            "branch": "Andheri",
            "executive_name": "Exec One",
            "team_manager": "Mgr One",
        }
        mismatches = {k: (v, l.get(k)) for k, v in expected.items() if str(l.get(k, "")) != v}
        assert not mismatches, f"Column mapping mismatches: {mismatches}"
        # numeric-ish fields
        for f in ("amount", "sanction", "disbursed"):
            assert l.get(f) not in (None, ""), f"{f} lost during import: {l.get(f)}"
        assert "2026-01-15" in str(l.get("login_date", "")), f"login_date={l.get('login_date')}"
        assert l.get("month") == MONTH and l.get("group_month") == MONTH


class TestImportEdgeCases:
    """Edge cases: pandas NaT for blank date cells + float coercion of numeric columns."""

    def test_blank_date_and_numeric_cells(self, client, created_ids):
        from datetime import date
        headers = ["Customer Name", "Login Date", "Amount", "Contact No", "Remark"]
        rows = [
            ["TESTNAN_EdgeA", date(2026, 1, 15), 5000000, 9876543210, "TESTNAN_edge1"],
            ["TESTNAN_EdgeB", None, None, None, "TESTNAN_edge2"],
        ]
        r = _import(client, _xlsx(headers, rows))
        assert r.status_code == 200, r.text[:400]
        loans = _fetch(client)
        created_ids.extend([l["id"] for l in loans if l["id"] not in created_ids])
        by = {l.get("remark"): l for l in loans}
        a, b = by["TESTNAN_edge1"], by["TESTNAN_edge2"]

        # BUG: blank date cell stored as literal "NaT"
        assert b.get("login_date") == "", f"blank Login Date stored as {b.get('login_date')!r}"
        # BUG: numeric columns containing a blank become floats -> "5000000.0" / "9876543210.0"
        assert a.get("contact_no") == "9876543210", f"contact_no corrupted: {a.get('contact_no')!r}"
        assert a.get("amount") in ("5000000", "5000000.00"), f"amount corrupted: {a.get('amount')!r}"


class TestNaNMigration:
    def test_no_nan_values_in_db(self, client):
        r = client.get(f"{BASE_URL}/api/loans", params={"limit": 500}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        loans = data.get("loans", data) if isinstance(data, dict) else data
        offenders = []
        for l in loans:
            for k, v in l.items():
                if isinstance(v, str) and v.strip().lower() == "nan":
                    offenders.append((l.get("id"), k))
        assert not offenders, f"Loans still holding 'nan': {offenders[:20]} (total {len(offenders)})"
