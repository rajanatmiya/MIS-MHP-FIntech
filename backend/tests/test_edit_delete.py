"""
Test Edit and Delete functionality for MIS and Loans pages
- PUT /api/loans/{loan_id} - Edit loan (any authenticated user)
- DELETE /api/loans/{loan_id} - Delete loan (admin only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"


class TestEditDeleteEndpoints:
    """Test Edit and Delete endpoints for loans"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def get_agent_token(self):
        """Get agent authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        return response.json()["access_token"]
    
    def create_test_loan(self, token):
        """Create a test loan for testing edit/delete"""
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        loan_data = {
            "customer_name": "TEST_EditDelete_Customer",
            "company_name": "TEST_EditDelete_Company",
            "contact_no": "9999888877",
            "status": "Hold",
            "bank": "TEST_Bank",
            "agent_name": "Test Agent",
            "month": "01-01-2026"
        }
        response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert response.status_code == 200, f"Create loan failed: {response.text}"
        return response.json()
    
    # ==================== EDIT TESTS ====================
    
    def test_admin_can_edit_loan(self):
        """Admin can edit any loan via PUT /api/loans/{loan_id}"""
        token = self.get_admin_token()
        
        # Create a test loan
        loan = self.create_test_loan(token)
        loan_id = loan["id"]
        
        # Edit the loan
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        update_data = {
            "customer_name": "TEST_Updated_Customer",
            "status": "Disbursed",
            "sanction": "500000"
        }
        response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        
        assert response.status_code == 200, f"Edit loan failed: {response.text}"
        updated_loan = response.json()
        assert updated_loan["customer_name"] == "TEST_Updated_Customer"
        assert updated_loan["status"] == "Disbursed"
        assert updated_loan["sanction"] == "500000"
        print(f"✅ Admin can edit loan - customer_name updated to '{updated_loan['customer_name']}'")
        
        # Cleanup - delete the test loan
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
    
    def test_agent_can_edit_own_loan(self):
        """Agent can edit their own loan via PUT /api/loans/{loan_id}"""
        agent_token = self.get_agent_token()
        
        # Create a test loan as agent
        loan = self.create_test_loan(agent_token)
        loan_id = loan["id"]
        
        # Edit the loan as agent
        self.session.headers.update({"Authorization": f"Bearer {agent_token}"})
        update_data = {
            "remark": "Updated by agent",
            "disbursed": "450000"
        }
        response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        
        assert response.status_code == 200, f"Agent edit loan failed: {response.text}"
        updated_loan = response.json()
        assert updated_loan["remark"] == "Updated by agent"
        assert updated_loan["disbursed"] == "450000"
        print(f"✅ Agent can edit own loan - remark updated to '{updated_loan['remark']}'")
        
        # Cleanup - admin deletes the test loan
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
    
    def test_edit_nonexistent_loan_returns_404(self):
        """Editing a non-existent loan returns 404"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.put(f"{BASE_URL}/api/loans/nonexistent-id-12345", json={
            "customer_name": "Test"
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Edit non-existent loan returns 404")
    
    # ==================== DELETE TESTS ====================
    
    def test_admin_can_delete_loan(self):
        """Admin can delete any loan via DELETE /api/loans/{loan_id}"""
        token = self.get_admin_token()
        
        # Create a test loan
        loan = self.create_test_loan(token)
        loan_id = loan["id"]
        
        # Delete the loan
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
        
        assert response.status_code == 200, f"Delete loan failed: {response.text}"
        result = response.json()
        assert "deleted" in result["message"].lower() or "success" in result["message"].lower()
        print(f"✅ Admin can delete loan - {result['message']}")
        
        # Verify loan is deleted
        get_response = self.session.get(f"{BASE_URL}/api/loans/{loan_id}")
        assert get_response.status_code == 404, "Loan should be deleted"
        print("✅ Verified loan is deleted (GET returns 404)")
    
    def test_agent_cannot_delete_loan(self):
        """Agent cannot delete loans - should get 403 Forbidden"""
        admin_token = self.get_admin_token()
        agent_token = self.get_agent_token()
        
        # Create a test loan as admin
        loan = self.create_test_loan(admin_token)
        loan_id = loan["id"]
        
        # Try to delete as agent - should fail with 403
        self.session.headers.update({"Authorization": f"Bearer {agent_token}"})
        response = self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
        
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.text}"
        print("✅ Agent cannot delete loan - returns 403 Forbidden (RBAC working)")
        
        # Cleanup - admin deletes the test loan
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
    
    def test_delete_nonexistent_loan_returns_404(self):
        """Deleting a non-existent loan returns 404"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.delete(f"{BASE_URL}/api/loans/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Delete non-existent loan returns 404")
    
    # ==================== EDIT FORM FIELDS TEST ====================
    
    def test_edit_all_loan_fields(self):
        """Test editing all loan fields via PUT endpoint"""
        token = self.get_admin_token()
        
        # Create a test loan
        loan = self.create_test_loan(token)
        loan_id = loan["id"]
        
        # Update all fields
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        update_data = {
            "customer_name": "TEST_Full_Update_Customer",
            "company_name": "TEST_Full_Update_Company",
            "contact_no": "1234567890",
            "status": "Disbursed",
            "bank": "HDFC",
            "sanction": "1000000",
            "disbursed": "950000",
            "remark": "Full update test",
            "decline_reason": "",
            "scheme": "Business Loan",
            "case_from": "Direct",
            "location": "Mumbai",
            "branch": "Andheri",
            "executive_name": "Test Executive",
            "team_manager": "Test Manager",
            "code": "BL001",
            "rate": "12.5",
            "pf": "10000",
            "insurance": "5000",
            "tenure": "36",
            "subvention": "2000",
            "brokerage_subvention": "1500",
            "agent_name": "Updated Agent",
            "month": "15-01-2026"
        }
        response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        
        assert response.status_code == 200, f"Full update failed: {response.text}"
        updated_loan = response.json()
        
        # Verify all fields updated
        assert updated_loan["customer_name"] == "TEST_Full_Update_Customer"
        assert updated_loan["company_name"] == "TEST_Full_Update_Company"
        assert updated_loan["status"] == "Disbursed"
        assert updated_loan["sanction"] == "1000000"
        assert updated_loan["disbursed"] == "950000"
        assert updated_loan["location"] == "Mumbai"
        assert updated_loan["month"] == "15-01-2026"
        print("✅ All loan fields can be updated via PUT endpoint")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")


class TestRBACForEditDelete:
    """Test RBAC for Edit and Delete operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_unauthenticated_cannot_edit(self):
        """Unauthenticated user cannot edit loans"""
        response = self.session.put(f"{BASE_URL}/api/loans/some-id", json={
            "customer_name": "Test"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Unauthenticated user cannot edit loans")
    
    def test_unauthenticated_cannot_delete(self):
        """Unauthenticated user cannot delete loans"""
        response = self.session.delete(f"{BASE_URL}/api/loans/some-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Unauthenticated user cannot delete loans")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
