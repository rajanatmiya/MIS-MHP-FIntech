"""Tests for Excel import group_month fix and optional company_name/contact_no."""
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

ADMIN = {"email": "admin@mhpfintech.com", "password": "Admin@123"}
TEST_MONTH = "Apr-2026"
TEST_NAMES = ["TEST_IMP_Alpha", "TEST_IMP_Beta"]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _loans(body):
    return body["loans"] if isinstance(body, dict) else body


def _cleanup(client):
    r = client.get(f"{BASE_URL}/api/loans", params={"search": "TEST_IMP_"}, timeout=120)
    if r.status_code != 200:
        return
    for loan in _loans(r.json()):
        if loan.get("customer_name") in TEST_NAMES:
            client.delete(f"{BASE_URL}/api/loans/{loan['id']}", timeout=60)


@pytest.fixture(scope="module", autouse=True)
def cleanup(client):
    _cleanup(client)
    yield
    _cleanup(client)


def _xlsx_bytes():
    wb = Workbook()
    ws = wb.active
    ws.append(["Customer Name", "Status"])
    for n in TEST_NAMES:
        ws.append([n, "Pending"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


class TestExcelImportGroupMonth:
    def test_import_sets_group_month(self, client):
        files = {"file": ("test_import.xlsx", _xlsx_bytes(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = client.post(f"{BASE_URL}/api/import/loans-excel", files=files,
                        data={"month": TEST_MONTH}, timeout=180)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        body = r.json()
        imported = body.get("imported", body.get("imported_count"))
        assert imported == 2, f"expected 2 imported, got {body}"

        # verify persistence + group_month
        g = client.get(f"{BASE_URL}/api/loans", params={"search": "TEST_IMP_"}, timeout=120)
        assert g.status_code == 200
        loans = _loans(g.json())
        found = [l for l in loans if l.get("customer_name") in TEST_NAMES]
        assert len(found) == 2, f"imported loans not returned by GET /api/loans: {len(found)}"
        for l in found:
            assert l.get("group_month") == TEST_MONTH, f"group_month={l.get('group_month')!r}"
            assert l.get("month") == TEST_MONTH, f"month={l.get('month')!r}"
            assert l.get("status") == "Pending"
            assert "_id" not in l

    def test_import_duplicate_detection(self, client):
        files = {"file": ("test_import.xlsx", _xlsx_bytes(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = client.post(f"{BASE_URL}/api/import/loans-excel", files=files,
                        data={"month": TEST_MONTH}, timeout=180)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body.get("duplicates") == 2, body


class TestOptionalCompanyContact:
    def test_create_loan_with_empty_company_and_contact(self, client):
        """Mimics the UI payload: keys present but empty strings."""
        payload = {"agent_name": "Admin User", "customer_name": TEST_NAMES[1] + "_EMPTY",
                   "company_name": "", "contact_no": "", "status": "Pending",
                   "bank": "SBI", "month": TEST_MONTH, "group_month": TEST_MONTH}
        r = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:500]}"
        created = r.json()
        try:
            assert created.get("company_name") == ""
            assert created.get("contact_no") == ""
            assert created.get("group_month") == TEST_MONTH
        finally:
            client.delete(f"{BASE_URL}/api/loans/{created['id']}", timeout=60)

    def test_create_loan_without_company_and_contact(self, client):
        payload = {"agent_name": "Admin User", "customer_name": TEST_NAMES[0] + "_NOCOMP",
                   "status": "Pending", "bank": "SBI",
                   "month": TEST_MONTH, "group_month": TEST_MONTH}
        r = client.post(f"{BASE_URL}/api/loans", json=payload, timeout=60)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:500]}"
        created = r.json()
        loan_id = created["id"]
        try:
            assert created.get("company_name", "") in ("", None)
            assert created.get("contact_no", "") in ("", None)
            assert created.get("group_month") == TEST_MONTH
            g = client.get(f"{BASE_URL}/api/loans/{loan_id}", timeout=60)
            if g.status_code == 200:
                assert g.json().get("customer_name") == payload["customer_name"]

            # update without company/contact should also work
            u = client.put(f"{BASE_URL}/api/loans/{loan_id}",
                           json={"status": "Approved"}, timeout=60)
            assert u.status_code == 200, f"{u.status_code}: {u.text[:400]}"
        finally:
            client.delete(f"{BASE_URL}/api/loans/{loan_id}", timeout=60)
