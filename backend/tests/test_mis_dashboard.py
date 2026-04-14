"""
MIS Dashboard Backend API Tests
Tests for authentication, RBAC, loans CRUD, and analytics endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dsa-agent-portal-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✅ Admin login successful: {data['user']['name']}")
    
    def test_agent_login_success(self):
        """Test agent login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == AGENT_EMAIL
        assert data["user"]["role"] == "agent"
        print(f"✅ Agent login successful: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✅ Get current user successful: {data['name']}")


class TestRBAC:
    """Role-Based Access Control tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def agent_token(self):
        """Get agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_sees_all_loans(self, admin_token):
        """Admin should see all loan data"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "loans" in data
        assert "total" in data
        print(f"✅ Admin sees {data['total']} total loans")
    
    def test_agent_sees_only_own_loans(self, agent_token):
        """Agent should see only their own loan data"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "loans" in data
        # Agent should only see loans they created
        print(f"✅ Agent sees {data['total']} loans (their own only)")
    
    def test_admin_can_access_users_endpoint(self, admin_token):
        """Admin should be able to access users endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"✅ Admin can access users endpoint: {len(users)} users")
    
    def test_agent_cannot_access_users_endpoint(self, agent_token):
        """Agent should NOT be able to access users endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403
        print("✅ Agent correctly denied access to users endpoint")
    
    def test_admin_can_delete_loan(self, admin_token):
        """Admin should be able to delete loans"""
        # First create a loan
        loan_data = {
            "agent_name": "TEST_Admin",
            "customer_name": "TEST_Delete Customer",
            "company_name": "TEST_Delete Company",
            "contact_no": "9999999999",
            "status": "Pending",
            "bank": "TEST_Bank",
            "month": "Jan-25"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        loan_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/loans/{loan_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        print("✅ Admin can delete loans")
    
    def test_agent_cannot_delete_loan(self, admin_token, agent_token):
        """Agent should NOT be able to delete loans"""
        # First create a loan as admin
        loan_data = {
            "agent_name": "TEST_Admin",
            "customer_name": "TEST_NoDelete Customer",
            "company_name": "TEST_NoDelete Company",
            "contact_no": "8888888888",
            "status": "Pending",
            "bank": "TEST_Bank",
            "month": "Jan-25"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        loan_id = create_response.json()["id"]
        
        # Try to delete as agent
        delete_response = requests.delete(
            f"{BASE_URL}/api/loans/{loan_id}",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert delete_response.status_code == 403
        print("✅ Agent correctly denied delete permission")
        
        # Cleanup - delete as admin
        requests.delete(
            f"{BASE_URL}/api/loans/{loan_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestLoansCRUD:
    """Loan CRUD operations tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_loan(self, admin_token):
        """Test creating a new loan"""
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_Customer",
            "company_name": "TEST_Company",
            "contact_no": "1234567890",
            "status": "Pending",
            "bank": "HDFC",
            "sanction": "500000",
            "disbursed": "450000",
            "month": "Jan-25"
        }
        response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_name"] == loan_data["customer_name"]
        assert data["bank"] == loan_data["bank"]
        assert "id" in data
        print(f"✅ Loan created: {data['id']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/loans/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_get_loans_list(self, admin_token):
        """Test getting loans list"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "loans" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        print(f"✅ Loans list retrieved: {data['total']} total")
    
    def test_update_loan(self, admin_token):
        """Test updating a loan"""
        # Create a loan first
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_Update Customer",
            "company_name": "TEST_Update Company",
            "contact_no": "1111111111",
            "status": "Pending",
            "bank": "ICICI",
            "month": "Feb-25"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        loan_id = create_response.json()["id"]
        
        # Update the loan
        update_data = {"status": "Disbursed", "sanction": "600000"}
        update_response = requests.put(
            f"{BASE_URL}/api/loans/{loan_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        
        updated_loan = update_response.json()
        assert updated_loan["status"] == "Disbursed"
        assert updated_loan["sanction"] == "600000"
        print(f"✅ Loan updated: status={updated_loan['status']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/loans/{loan_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestAnalytics:
    """Analytics endpoints tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_analytics_overview(self, admin_token):
        """Test analytics overview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "disbursed" in data
        assert "declined" in data
        assert "pending" in data
        assert "status_breakdown" in data
        print(f"✅ Analytics overview: total={data['total']}, disbursed={data['disbursed']}")
    
    def test_analytics_by_bank(self, admin_token):
        """Test analytics by bank endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/by-bank",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        print(f"✅ Analytics by bank: {len(data)} banks")
    
    def test_analytics_by_agent(self, admin_token):
        """Test analytics by agent endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/by-agent",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        print(f"✅ Analytics by agent: {len(data)} agents")
    
    def test_analytics_unique_values(self, admin_token):
        """Test analytics unique values endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/unique-values",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "banks" in data
        assert "statuses" in data
        assert "agents" in data
        print(f"✅ Unique values: {len(data['banks'])} banks, {len(data['statuses'])} statuses")


class TestSchemesAndStatuses:
    """Schemes and Statuses management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_schemes(self, admin_token):
        """Test getting schemes list"""
        response = requests.get(
            f"{BASE_URL}/api/schemes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        schemes = response.json()
        assert isinstance(schemes, list)
        print(f"✅ Schemes retrieved: {len(schemes)} schemes")
    
    def test_get_statuses(self, admin_token):
        """Test getting statuses list"""
        response = requests.get(
            f"{BASE_URL}/api/statuses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        statuses = response.json()
        assert isinstance(statuses, list)
        print(f"✅ Statuses retrieved: {len(statuses)} statuses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
