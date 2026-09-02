"""Regression: master name fields containing regex metacharacters must not break
the case-insensitive duplicate-name check (which interpolates the name into $regex
without re.escape) nor the rename propagation.
"""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "admin@mhpfintech.com", "password": "Admin@123"}
SUF = uuid.uuid4().hex[:6]

# names that are invalid / dangerous when used raw inside a regex
BAD_NAMES = [
    "TEST_Unbalanced(Paren",
    "TEST_Unbalanced[Bracket",
    "TEST_Star*Name",
    "TEST_Plus+Name",
    "TEST_Backslash\\Name",
]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    body = r.json()
    token = body.get("access_token") or body.get("token")
    if not token:
        pytest.fail(f"No token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.mark.parametrize("bad", BAD_NAMES)
def test_rename_to_regex_unsafe_name_no_500(client, bad):
    """PUT with a metacharacter-laden name must not return 500."""
    safe = f"TEST_RegexSafe_{SUF}_{abs(hash(bad)) % 9999}"
    target = f"{bad}_{SUF}"
    cr = client.post(f"{BASE_URL}/api/master/customers",
                     json={"name": safe, "contact_no": "9998886000"}, timeout=30)
    assert cr.status_code == 200, f"create failed: {cr.status_code} {cr.text[:200]}"
    cid = cr.json()["id"]
    try:
        pr = client.put(f"{BASE_URL}/api/master/customers/{cid}",
                        json={"name": target, "contact_no": "9998886000"}, timeout=30)
        assert pr.status_code != 500, (
            f"500 on rename to regex-unsafe name {target!r}: {pr.text[:300]}"
        )
        assert pr.status_code == 200, f"unexpected {pr.status_code}: {pr.text[:300]}"
    finally:
        client.delete(f"{BASE_URL}/api/master/customers/{cid}", timeout=30)


@pytest.mark.parametrize("bad", BAD_NAMES)
def test_create_regex_unsafe_name_no_500(client, bad):
    """POST duplicate-check regex must tolerate metacharacters."""
    target = f"{bad}_c_{SUF}"
    r = client.post(f"{BASE_URL}/api/master/customers",
                    json={"name": target, "contact_no": "9998886001"}, timeout=30)
    try:
        assert r.status_code != 500, f"500 creating {target!r}: {r.text[:300]}"
        assert r.status_code == 200, f"unexpected {r.status_code}: {r.text[:300]}"
        # second create with same name must be rejected (dup check must work, not crash)
        r2 = client.post(f"{BASE_URL}/api/master/customers",
                         json={"name": target, "contact_no": "9998886001"}, timeout=30)
        assert r2.status_code == 400, (
            f"duplicate {target!r} not rejected: {r2.status_code} {r2.text[:200]}"
        )
    finally:
        if r.status_code == 200:
            client.delete(f"{BASE_URL}/api/master/customers/{r.json()['id']}", timeout=30)
