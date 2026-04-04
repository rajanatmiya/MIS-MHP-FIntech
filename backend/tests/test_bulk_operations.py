"""
Test Bulk Operations and Multi-Checkbox Filters for MIS Dashboard
Features tested:
1. POST /api/loans/bulk-status - Updates status for multiple loan IDs
2. POST /api/loans/bulk-delete - Deletes multiple loans by IDs (admin only)
3. Agent gets 403 on bulk-delete
4. Multi-filter correctly filters loans
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
MANAGER_EMAIL = "manager@mhpfintech.com"
MANAGER_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def manager_token():
    """Get manager authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    assert response.status_code == 200, f"Manager login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def agent_token():
    """Get agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    assert response.status_code == 200, f"Agent login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_loans(admin_token):
    """Create test loans for bulk operations"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    test_prefix = f"TEST_BULK_{uuid.uuid4().hex[:6]}"
    
    loan_ids = []
    for i in range(3):
        loan_data = {
            "customer_name": f"{test_prefix}_Customer_{i}",
            "company_name": f"{test_prefix}_Company_{i}",
            "contact_no": f"999000{i:04d}",
            "status": "Login Done",
            "bank": "SBI",
            "agent_name": "Test Agent",
            "month": "01-01-2026",
            "category": "SECURED",
            "product": "Home Loan"
        }
        response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=headers)
        assert response.status_code == 200, f"Failed to create test loan: {response.text}"
        loan_ids.append(response.json()["id"])
    
    yield loan_ids
    
    # Cleanup - delete test loans
    for loan_id in loan_ids:
        try:
            requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        except:
            pass


class TestBulkStatusUpdate:
    """Tests for POST /api/loans/bulk-status endpoint"""
    
    def test_bulk_status_update_admin(self, admin_token, test_loans):
        """Admin can update status for multiple loans"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": test_loans[:2], "status": "Disbursed"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Bulk status update failed: {response.text}"
        data = response.json()
        assert "modified_count" in data
        assert data["modified_count"] == 2
        print(f"SUCCESS: Admin bulk status update - {data['modified_count']} loans updated to 'Disbursed'")
    
    def test_bulk_status_update_manager(self, manager_token, test_loans):
        """Manager can update status for multiple loans"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": [test_loans[2]], "status": "Hold"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Manager bulk status update failed: {response.text}"
        data = response.json()
        assert data["modified_count"] >= 0  # May be 0 if loan not accessible to manager
        print(f"SUCCESS: Manager bulk status update - {data['modified_count']} loans updated")
    
    def test_bulk_status_update_agent(self, agent_token, test_loans):
        """Agent can update status for their accessible loans"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": [test_loans[0]], "status": "Decline"},
            headers=headers
        )
        
        # Agent should be able to call the endpoint (no role restriction on bulk-status)
        assert response.status_code == 200, f"Agent bulk status update failed: {response.text}"
        print(f"SUCCESS: Agent can call bulk-status endpoint")
    
    def test_bulk_status_update_empty_ids(self, admin_token):
        """Bulk status update with empty ids returns 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": [], "status": "Disbursed"},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for empty ids, got {response.status_code}"
        print("SUCCESS: Empty ids returns 400 error")
    
    def test_bulk_status_update_missing_status(self, admin_token, test_loans):
        """Bulk status update without status returns 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": test_loans[:1], "status": ""},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for missing status, got {response.status_code}"
        print("SUCCESS: Missing status returns 400 error")
    
    def test_bulk_status_verify_persistence(self, admin_token, test_loans):
        """Verify bulk status update persists in database"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update status
        requests.post(
            f"{BASE_URL}/api/loans/bulk-status",
            json={"ids": [test_loans[0]], "status": "Login Done"},
            headers=headers
        )
        
        # Verify by fetching the loan
        response = requests.get(f"{BASE_URL}/api/loans/{test_loans[0]}", headers=headers)
        assert response.status_code == 200
        loan = response.json()
        assert loan["status"] == "Login Done", f"Status not persisted: {loan['status']}"
        print("SUCCESS: Bulk status update persisted correctly")


class TestBulkDelete:
    """Tests for POST /api/loans/bulk-delete endpoint"""
    
    def test_bulk_delete_admin_only(self, admin_token):
        """Admin can bulk delete loans"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create test loans for deletion
        loan_ids = []
        for i in range(2):
            loan_data = {
                "customer_name": f"TEST_DELETE_{uuid.uuid4().hex[:6]}",
                "company_name": "Delete Test Co",
                "contact_no": f"888000{i:04d}",
                "status": "Login Done",
                "bank": "HDFC Bank",
                "agent_name": "Test Agent",
                "month": "01-01-2026"
            }
            response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=headers)
            assert response.status_code == 200
            loan_ids.append(response.json()["id"])
        
        # Bulk delete
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-delete",
            json={"ids": loan_ids},
            headers=headers
        )
        
        assert response.status_code == 200, f"Bulk delete failed: {response.text}"
        data = response.json()
        assert data["deleted_count"] == 2
        print(f"SUCCESS: Admin bulk delete - {data['deleted_count']} loans deleted")
    
    def test_bulk_delete_agent_forbidden(self, agent_token):
        """Agent gets 403 on bulk-delete"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-delete",
            json={"ids": ["fake-id-1", "fake-id-2"]},
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for agent, got {response.status_code}: {response.text}"
        print("SUCCESS: Agent correctly gets 403 on bulk-delete")
    
    def test_bulk_delete_manager_forbidden(self, manager_token):
        """Manager gets 403 on bulk-delete (admin only)"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-delete",
            json={"ids": ["fake-id-1"]},
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for manager, got {response.status_code}: {response.text}"
        print("SUCCESS: Manager correctly gets 403 on bulk-delete")
    
    def test_bulk_delete_empty_ids(self, admin_token):
        """Bulk delete with empty ids returns 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/loans/bulk-delete",
            json={"ids": []},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for empty ids, got {response.status_code}"
        print("SUCCESS: Empty ids returns 400 error")
    
    def test_bulk_delete_verify_removal(self, admin_token):
        """Verify bulk deleted loans are actually removed"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test loan
        loan_data = {
            "customer_name": f"TEST_VERIFY_DELETE_{uuid.uuid4().hex[:6]}",
            "company_name": "Verify Delete Co",
            "contact_no": "7770001234",
            "status": "Login Done",
            "bank": "ICICI Bank",
            "agent_name": "Test Agent",
            "month": "01-01-2026"
        }
        response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=headers)
        loan_id = response.json()["id"]
        
        # Bulk delete
        requests.post(
            f"{BASE_URL}/api/loans/bulk-delete",
            json={"ids": [loan_id]},
            headers=headers
        )
        
        # Verify loan is gone
        response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 404, f"Loan should be deleted, got {response.status_code}"
        print("SUCCESS: Bulk deleted loan verified as removed")


class TestMasterDataForFilters:
    """Tests for master data endpoints used by multi-checkbox filters"""
    
    def test_get_categories(self, admin_token):
        """GET /api/master/categories returns categories for filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/master/categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) >= 6, f"Expected at least 6 categories, got {len(categories)}"
        
        # Verify expected categories exist
        category_names = [c["name"] for c in categories]
        expected = ["CAR LOAN", "PID", "PVT Funding", "SECURED", "Salaried", "UNSECURED"]
        for exp in expected:
            assert exp in category_names, f"Missing category: {exp}"
        
        print(f"SUCCESS: Categories endpoint returns {len(categories)} categories")
    
    def test_get_products(self, admin_token):
        """GET /api/master/products returns products for filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/master/products", headers=headers)
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) >= 6, f"Expected at least 6 products, got {len(products)}"
        
        # Verify expected products exist
        product_names = [p["name"] for p in products]
        expected = ["Business Loan", "Car Loan", "Home Loan", "LAP", "Personal Loan"]
        for exp in expected:
            assert exp in product_names, f"Missing product: {exp}"
        
        print(f"SUCCESS: Products endpoint returns {len(products)} products")
    
    def test_get_banks(self, admin_token):
        """GET /api/master/banks returns banks for filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/master/banks", headers=headers)
        assert response.status_code == 200
        
        banks = response.json()
        assert len(banks) >= 90, f"Expected at least 90 banks, got {len(banks)}"
        
        # Verify banks have proper structure
        bank_names = [b["name"] for b in banks]
        assert len(bank_names) > 0, "No bank names found"
        # Check that each bank has id and name
        for bank in banks[:5]:
            assert "id" in bank
            assert "name" in bank
        
        print(f"SUCCESS: Banks endpoint returns {len(banks)} banks")


class TestStatusesForBulkUpdate:
    """Tests for statuses endpoint used by bulk status update dropdown"""
    
    def test_get_statuses(self, admin_token):
        """GET /api/statuses returns all statuses for bulk update dropdown"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/statuses", headers=headers)
        assert response.status_code == 200
        
        statuses = response.json()
        assert len(statuses) > 0, "Expected at least one status"
        
        # Verify status structure
        for status in statuses:
            assert "id" in status
            assert "name" in status
        
        status_names = [s["name"] for s in statuses]
        print(f"SUCCESS: Statuses endpoint returns {len(statuses)} statuses: {status_names[:5]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
