"""
Test RBAC Data Visibility - P0 Bug Fix Verification
Tests that agents/managers with assigned_categories/products can see loans with empty/null category and product fields.
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

# Agent has: assigned_banks: SBI, HDFC Bank; assigned_categories: SECURED, UNSECURED; assigned_products: Home Loan, LAP


class TestRBACDataVisibility:
    """Test RBAC data visibility - P0 bug fix for empty/null category/product fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_loan_ids = []
        yield
        # Cleanup: Delete test loans
        self._cleanup_test_loans()
    
    def _cleanup_test_loans(self):
        """Cleanup test loans created during tests"""
        if not self.created_loan_ids:
            return
        admin_token = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            for loan_id in self.created_loan_ids:
                try:
                    self.session.delete(
                        f"{BASE_URL}/api/loans/{loan_id}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                except:
                    pass
    
    def _login(self, email, password):
        """Login and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def _create_test_loan(self, token, category="", product="", bank="SBI"):
        """Create a test loan with specified category/product"""
        loan_data = {
            "agent_name": "Test Agent",
            "customer_name": f"TEST_Customer_{uuid.uuid4().hex[:8]}",
            "company_name": "Test Company",
            "contact_no": "9999999999",
            "status": "Login Done",
            "bank": bank,
            "category": category,
            "product": product,
            "month": "Jan-26"
        }
        response = self.session.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            loan = response.json()
            self.created_loan_ids.append(loan["id"])
            return loan
        return None
    
    # ==================== AUTH TESTS ====================
    
    def test_admin_login(self):
        """Test admin can login"""
        token = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token is not None, "Admin login failed"
        print(f"✓ Admin login successful")
    
    def test_manager_login(self):
        """Test manager can login"""
        token = self._login(MANAGER_EMAIL, MANAGER_PASSWORD)
        assert token is not None, "Manager login failed"
        print(f"✓ Manager login successful")
    
    def test_agent_login(self):
        """Test agent can login"""
        token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert token is not None, "Agent login failed"
        print(f"✓ Agent login successful")
    
    # ==================== P0 BUG FIX TESTS ====================
    
    def test_agent_sees_loans_with_empty_category(self):
        """P0 BUG FIX: Agent with assigned_categories should see loans with empty category"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Create a loan with empty category (as agent)
        loan = self._create_test_loan(agent_token, category="", product="Home Loan", bank="SBI")
        assert loan is not None, "Failed to create test loan"
        
        # Fetch loans as agent
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        loan_ids = [l["id"] for l in loans]
        
        assert loan["id"] in loan_ids, f"Agent cannot see loan with empty category - P0 BUG NOT FIXED"
        print(f"✓ Agent can see loan with empty category (P0 bug fix verified)")
    
    def test_agent_sees_loans_with_empty_product(self):
        """P0 BUG FIX: Agent with assigned_products should see loans with empty product"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Create a loan with empty product (as agent)
        loan = self._create_test_loan(agent_token, category="SECURED", product="", bank="SBI")
        assert loan is not None, "Failed to create test loan"
        
        # Fetch loans as agent
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        loan_ids = [l["id"] for l in loans]
        
        assert loan["id"] in loan_ids, f"Agent cannot see loan with empty product - P0 BUG NOT FIXED"
        print(f"✓ Agent can see loan with empty product (P0 bug fix verified)")
    
    def test_agent_sees_loans_with_both_empty_category_and_product(self):
        """P0 BUG FIX: Agent should see loans with both empty category AND product"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Create a loan with both empty category and product
        loan = self._create_test_loan(agent_token, category="", product="", bank="SBI")
        assert loan is not None, "Failed to create test loan"
        
        # Fetch loans as agent
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        loan_ids = [l["id"] for l in loans]
        
        assert loan["id"] in loan_ids, f"Agent cannot see loan with both empty category and product - P0 BUG NOT FIXED"
        print(f"✓ Agent can see loan with both empty category and product (P0 bug fix verified)")
    
    def test_agent_sees_loans_with_assigned_category_and_product(self):
        """Agent should see loans with matching assigned category and product"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Create a loan with assigned category and product
        loan = self._create_test_loan(agent_token, category="SECURED", product="Home Loan", bank="SBI")
        assert loan is not None, "Failed to create test loan"
        
        # Fetch loans as agent
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        loan_ids = [l["id"] for l in loans]
        
        assert loan["id"] in loan_ids, f"Agent cannot see loan with assigned category/product"
        print(f"✓ Agent can see loan with assigned category and product")
    
    # ==================== ANALYTICS ENDPOINTS TESTS ====================
    
    def test_agent_analytics_overview(self):
        """Test /api/analytics/overview works for agent"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/overview failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in overview response"
        assert "disbursed" in data, "Missing 'disbursed' in overview response"
        print(f"✓ Agent analytics overview works - total: {data.get('total')}")
    
    def test_agent_analytics_team_leaderboard(self):
        """Test /api/analytics/team-leaderboard works for agent"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/team-leaderboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/team-leaderboard failed: {response.status_code}"
        
        data = response.json()
        assert "leaderboard" in data, "Missing 'leaderboard' in response"
        print(f"✓ Agent analytics team-leaderboard works - agents: {data.get('total_agents')}")
    
    def test_agent_analytics_unique_values(self):
        """Test /api/analytics/unique-values works for agent"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/unique-values",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/unique-values failed: {response.status_code}"
        
        data = response.json()
        assert "banks" in data, "Missing 'banks' in response"
        assert "statuses" in data, "Missing 'statuses' in response"
        print(f"✓ Agent analytics unique-values works - banks: {data.get('banks')}")
    
    # ==================== ADMIN VISIBILITY TESTS ====================
    
    def test_admin_sees_all_loans(self):
        """Admin should see all loans regardless of category/product"""
        admin_token = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        assert "loans" in data, "Missing 'loans' in response"
        assert "total" in data, "Missing 'total' in response"
        print(f"✓ Admin can see all loans - total: {data.get('total')}")
    
    def test_admin_analytics_overview(self):
        """Test /api/analytics/overview works for admin"""
        admin_token = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/overview failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in overview response"
        print(f"✓ Admin analytics overview works - total: {data.get('total')}")
    
    # ==================== LOAN CREATION TEST ====================
    
    def test_agent_can_create_loan(self):
        """Test agent can create a loan"""
        agent_token = self._login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        loan_data = {
            "agent_name": "Test Agent",
            "customer_name": f"TEST_NewCustomer_{uuid.uuid4().hex[:8]}",
            "company_name": "Test Company",
            "contact_no": "9876543210",
            "status": "Login Done",
            "bank": "SBI",
            "category": "SECURED",
            "product": "Home Loan",
            "month": "Jan-26"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"POST /api/loans failed: {response.status_code} - {response.text}"
        
        loan = response.json()
        self.created_loan_ids.append(loan["id"])
        
        assert loan["customer_name"] == loan_data["customer_name"], "Customer name mismatch"
        assert loan["bank"] == loan_data["bank"], "Bank mismatch"
        print(f"✓ Agent can create loan - id: {loan['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
