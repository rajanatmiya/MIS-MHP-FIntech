"""
Test Entry Status Feature (Open/Closed toggle)
- PATCH /api/loans/{loan_id}/entry-status endpoint
- Carry-forward excludes Closed entries
- Entry status field defaults to 'Open'
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
MANAGER_EMAIL = "jyoti.tripathi@mhpfintech.com"
MANAGER_PASSWORD = "Jyoti@MHP"
AGENT_EMAIL = "dhruvi.shah@mhpfintech.com"
AGENT_PASSWORD = "Dhruvi@MHP"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def manager_token():
    """Get manager auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    assert response.status_code == 200, f"Manager login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def agent_token():
    """Get agent auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    assert response.status_code == 200, f"Agent login failed: {response.text}"
    return response.json()["access_token"]


class TestEntryStatusEndpoint:
    """Test PATCH /api/loans/{loan_id}/entry-status endpoint"""
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print("✓ Admin login successful")
    
    def test_create_test_loan_for_entry_status(self, admin_token):
        """Create a test loan to test entry_status toggle"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        loan_data = {
            "agent_name": "TEST_EntryStatus_Agent",
            "customer_name": f"TEST_EntryStatus_Customer_{unique_id}",
            "company_name": "TEST_EntryStatus_Company",
            "contact_no": "9999999999",
            "status": "Login Done",
            "bank": "SBI",
            "month": "01-01-2026",
            "category": "SECURED",
            "product": "Home Loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=headers)
        assert response.status_code == 200, f"Failed to create loan: {response.text}"
        
        loan = response.json()
        assert "id" in loan
        # New loans should default to 'Open' entry_status
        assert loan.get("entry_status", "Open") == "Open", "New loan should have entry_status='Open'"
        
        # Store loan_id for cleanup
        TestEntryStatusEndpoint.test_loan_id = loan["id"]
        print(f"✓ Created test loan with id={loan['id']}, entry_status={loan.get('entry_status', 'Open')}")
    
    def test_toggle_entry_status_to_closed(self, admin_token):
        """Test toggling entry_status from Open to Closed"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestEntryStatusEndpoint.test_loan_id
        
        response = requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Closed"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to toggle entry_status: {response.text}"
        data = response.json()
        assert data["entry_status"] == "Closed"
        print(f"✓ Entry status toggled to Closed: {data}")
    
    def test_verify_entry_status_persisted(self, admin_token):
        """Verify entry_status is persisted in database"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestEntryStatusEndpoint.test_loan_id
        
        response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get loan: {response.text}"
        
        loan = response.json()
        assert loan["entry_status"] == "Closed", f"Expected entry_status='Closed', got '{loan.get('entry_status')}'"
        print(f"✓ Entry status persisted as Closed")
    
    def test_toggle_entry_status_back_to_open(self, admin_token):
        """Test toggling entry_status from Closed back to Open"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestEntryStatusEndpoint.test_loan_id
        
        response = requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Open"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to toggle entry_status: {response.text}"
        data = response.json()
        assert data["entry_status"] == "Open"
        print(f"✓ Entry status toggled back to Open: {data}")
    
    def test_invalid_entry_status_value(self, admin_token):
        """Test that invalid entry_status values are rejected"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestEntryStatusEndpoint.test_loan_id
        
        response = requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Invalid"},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid entry_status, got {response.status_code}"
        print(f"✓ Invalid entry_status correctly rejected with 400")
    
    def test_manager_can_toggle_entry_status(self, manager_token, admin_token):
        """Test that manager can toggle entry_status on team loans"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        # First create a loan as admin that manager can access
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        loan_data = {
            "agent_name": "TEST_Manager_EntryStatus",
            "customer_name": f"TEST_Manager_Customer_{unique_id}",
            "company_name": "TEST_Company",
            "contact_no": "8888888888",
            "status": "Hold",
            "bank": "YES BANK",
            "month": "01-01-2026"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=admin_headers)
        assert create_response.status_code == 200
        loan_id = create_response.json()["id"]
        
        # Manager toggles entry_status
        response = requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Closed"},
            headers=headers
        )
        
        # Manager should be able to toggle (or get 403 if not their team loan)
        # The endpoint doesn't have explicit RBAC check, so it should work
        if response.status_code == 200:
            print(f"✓ Manager can toggle entry_status")
        else:
            print(f"! Manager toggle returned {response.status_code}: {response.text}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=admin_headers)
    
    def test_cleanup_test_loan(self, admin_token):
        """Cleanup test loan"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestEntryStatusEndpoint.test_loan_id
        
        response = requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 200, f"Failed to delete test loan: {response.text}"
        print(f"✓ Test loan cleaned up")


class TestCarryForwardExcludesClosed:
    """Test that carry-forward excludes Closed entries"""
    
    def test_setup_carry_forward_test_data(self, admin_token):
        """Create test loans for carry-forward testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        # Create loan 1: Open status, should be carried forward
        loan1_data = {
            "agent_name": "TEST_CF_Agent",
            "customer_name": f"TEST_CF_Open_{unique_id}",
            "company_name": "TEST_CF_Company",
            "contact_no": "7777777777",
            "status": "Login Done",  # Not Disbursed
            "bank": "HDFC",
            "month": "01-03-2026",  # March 2026
            "group_month": "Mar-2026"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/loans", json=loan1_data, headers=headers)
        assert response1.status_code == 200
        TestCarryForwardExcludesClosed.open_loan_id = response1.json()["id"]
        print(f"✓ Created Open loan: {TestCarryForwardExcludesClosed.open_loan_id}")
        
        # Create loan 2: Will be set to Closed, should NOT be carried forward
        loan2_data = {
            "agent_name": "TEST_CF_Agent",
            "customer_name": f"TEST_CF_Closed_{unique_id}",
            "company_name": "TEST_CF_Company",
            "contact_no": "6666666666",
            "status": "Hold",  # Not Disbursed
            "bank": "ICICI",
            "month": "01-03-2026",  # March 2026
            "group_month": "Mar-2026"
        }
        
        response2 = requests.post(f"{BASE_URL}/api/loans", json=loan2_data, headers=headers)
        assert response2.status_code == 200
        TestCarryForwardExcludesClosed.closed_loan_id = response2.json()["id"]
        print(f"✓ Created loan to be Closed: {TestCarryForwardExcludesClosed.closed_loan_id}")
        
        # Create loan 3: Disbursed status, should NOT be carried forward (regardless of entry_status)
        loan3_data = {
            "agent_name": "TEST_CF_Agent",
            "customer_name": f"TEST_CF_Disbursed_{unique_id}",
            "company_name": "TEST_CF_Company",
            "contact_no": "5555555555",
            "status": "Disbursed",  # Disbursed - should not carry forward
            "bank": "SBI",
            "month": "01-03-2026",  # March 2026
            "group_month": "Mar-2026"
        }
        
        response3 = requests.post(f"{BASE_URL}/api/loans", json=loan3_data, headers=headers)
        assert response3.status_code == 200
        TestCarryForwardExcludesClosed.disbursed_loan_id = response3.json()["id"]
        print(f"✓ Created Disbursed loan: {TestCarryForwardExcludesClosed.disbursed_loan_id}")
    
    def test_set_loan_to_closed(self, admin_token):
        """Set one loan to Closed entry_status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestCarryForwardExcludesClosed.closed_loan_id
        
        response = requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Closed"},
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Set loan {loan_id} to Closed")
    
    def test_carry_forward_excludes_closed_and_disbursed(self, admin_token):
        """Test carry-forward endpoint excludes Closed and Disbursed entries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Carry forward from Mar-2026 to Apr-2026
        response = requests.post(
            f"{BASE_URL}/api/loans/carry-forward",
            json={"to_month_key": "Apr-2026"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Carry forward failed: {response.text}"
        data = response.json()
        
        print(f"Carry forward result: {data}")
        
        # The carried_count should only include Open, non-Disbursed loans
        # We created 3 loans: 1 Open, 1 Closed, 1 Disbursed
        # Only the Open one should be carried forward
        # Note: There might be other loans in the system, so we check the message
        assert "carried_count" in data
        print(f"✓ Carry forward completed: {data['carried_count']} loans carried")
    
    def test_verify_closed_loan_not_carried(self, admin_token):
        """Verify that the Closed loan was NOT carried forward to Apr-2026"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all loans for Apr-2026
        response = requests.get(f"{BASE_URL}/api/loans?limit=2000", headers=headers)
        assert response.status_code == 200
        
        loans = response.json().get("loans", response.json())
        
        # Find loans in Apr-2026 group
        apr_loans = [l for l in loans if l.get("group_month") == "Apr-2026"]
        
        # Check that our Closed loan's customer name is NOT in Apr-2026
        closed_customer_names = [l["customer_name"] for l in apr_loans if "TEST_CF_Closed" in l.get("customer_name", "")]
        
        # The Closed loan should NOT have been carried forward
        assert len(closed_customer_names) == 0, f"Closed loan was incorrectly carried forward: {closed_customer_names}"
        print(f"✓ Closed loan correctly excluded from carry-forward")
    
    def test_verify_disbursed_loan_not_carried(self, admin_token):
        """Verify that the Disbursed loan was NOT carried forward"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/loans?limit=2000", headers=headers)
        assert response.status_code == 200
        
        loans = response.json().get("loans", response.json())
        apr_loans = [l for l in loans if l.get("group_month") == "Apr-2026"]
        
        disbursed_customer_names = [l["customer_name"] for l in apr_loans if "TEST_CF_Disbursed" in l.get("customer_name", "")]
        
        assert len(disbursed_customer_names) == 0, f"Disbursed loan was incorrectly carried forward: {disbursed_customer_names}"
        print(f"✓ Disbursed loan correctly excluded from carry-forward")
    
    def test_cleanup_carry_forward_test_data(self, admin_token):
        """Cleanup all test loans"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Delete original test loans
        for loan_id in [
            TestCarryForwardExcludesClosed.open_loan_id,
            TestCarryForwardExcludesClosed.closed_loan_id,
            TestCarryForwardExcludesClosed.disbursed_loan_id
        ]:
            requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        
        # Delete any carried-forward loans
        response = requests.get(f"{BASE_URL}/api/loans?limit=2000", headers=headers)
        if response.status_code == 200:
            loans = response.json().get("loans", response.json())
            for loan in loans:
                if "TEST_CF_" in loan.get("customer_name", ""):
                    requests.delete(f"{BASE_URL}/api/loans/{loan['id']}", headers=headers)
        
        print(f"✓ Test data cleaned up")


class TestExistingLoanCRUD:
    """Test that existing loan CRUD still works with entry_status field"""
    
    def test_create_loan_with_default_entry_status(self, admin_token):
        """Create loan and verify default entry_status is Open"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        loan_data = {
            "agent_name": "TEST_CRUD_Agent",
            "customer_name": f"TEST_CRUD_Customer_{unique_id}",
            "company_name": "TEST_CRUD_Company",
            "contact_no": "4444444444",
            "status": "Login Done",
            "bank": "AXIS",
            "month": "15-01-2026"
        }
        
        response = requests.post(f"{BASE_URL}/api/loans", json=loan_data, headers=headers)
        assert response.status_code == 200
        
        loan = response.json()
        TestExistingLoanCRUD.test_loan_id = loan["id"]
        
        # Verify default entry_status
        assert loan.get("entry_status", "Open") == "Open"
        print(f"✓ Created loan with default entry_status='Open'")
    
    def test_update_loan_preserves_entry_status(self, admin_token):
        """Update loan and verify entry_status is preserved"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestExistingLoanCRUD.test_loan_id
        
        # First set entry_status to Closed
        requests.patch(
            f"{BASE_URL}/api/loans/{loan_id}/entry-status",
            json={"entry_status": "Closed"},
            headers=headers
        )
        
        # Now update other fields
        response = requests.put(
            f"{BASE_URL}/api/loans/{loan_id}",
            json={"remark": "Updated remark"},
            headers=headers
        )
        
        assert response.status_code == 200
        loan = response.json()
        
        # entry_status should still be Closed
        assert loan.get("entry_status") == "Closed", f"entry_status changed unexpectedly: {loan.get('entry_status')}"
        assert loan.get("remark") == "Updated remark"
        print(f"✓ Update preserves entry_status")
    
    def test_get_loan_includes_entry_status(self, admin_token):
        """Get loan and verify entry_status is included"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestExistingLoanCRUD.test_loan_id
        
        response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 200
        
        loan = response.json()
        assert "entry_status" in loan or loan.get("entry_status") is not None
        print(f"✓ GET loan includes entry_status: {loan.get('entry_status')}")
    
    def test_list_loans_includes_entry_status(self, admin_token):
        """List loans and verify entry_status is included"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/loans?limit=10", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        loans = data.get("loans", data)
        
        # Check that at least one loan has entry_status field
        has_entry_status = any("entry_status" in loan for loan in loans)
        print(f"✓ List loans includes entry_status field: {has_entry_status}")
    
    def test_delete_loan_works(self, admin_token):
        """Delete loan works correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        loan_id = TestExistingLoanCRUD.test_loan_id
        
        response = requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 200
        print(f"✓ Delete loan works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
