"""Excel import: duplicate customer names must be allowed (no skipping)."""
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
TEST_MONTH = "Sep-2026"
NAMES = ["TestDupA", "TestDupA", "TestDupB"]
UNIQUE_NAMES = {"TestDupA", "TestDupB"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:300]}")
    body = r.json()
    token = body.get("access_token") or body.get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _loans(body):
    return body["loans"] if isinstance(body, dict) else body


def _test_loans(client):
    r = client.get(f"{BASE_URL}/api/loans", timeout=120)
    assert r.status_code == 200, r.text[:300]
    return [
        loan for loan in _loans(r.json())
        if loan.get("customer_name") in UNIQUE_NAMES
    ]


def _cleanup(client):
    for loan in _test_loans(client):
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
    for n in NAMES:
        ws.append([n, "Pending"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


def _do_import(client):
    files = {"file": ("TEST_dup.xlsx", _xlsx_bytes(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    return client.post(f"{BASE_URL}/api/import/loans-excel", files=files,
                       data={"month": TEST_MONTH}, timeout=120)


class TestImportDuplicatesAllowed:
    def test_first_import_all_rows(self, client):
        r = _do_import(client)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert d["imported"] == 3, d
        assert d["skipped"] == 0, d
        assert d["duplicates"] == 0, d
        assert d["total_rows"] == 3, d
        assert d.get("errors") in ([], None), d

    def test_second_import_not_blocked(self, client):
        r = _do_import(client)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert d["imported"] == 3, d
        assert d["skipped"] == 0, d
        assert d["duplicates"] == 0, d

    def test_all_six_persisted(self, client):
        loans = _test_loans(client)
        assert len(loans) == 6, f"expected 6, got {len(loans)}"
        assert sum(1 for x in loans if x["customer_name"] == "TestDupA") == 4
        assert sum(1 for x in loans if x["customer_name"] == "TestDupB") == 2
        for loan in loans:
            assert loan.get("group_month") == TEST_MONTH, loan
            assert loan.get("month") == TEST_MONTH, loan
            assert loan.get("status") == "Pending", loan
            assert "_id" not in loan, "MongoDB _id leaked in response"
