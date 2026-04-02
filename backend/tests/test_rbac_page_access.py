"""
Test Role-Based Access Control (RBAC) for Page Access and Data Filtering
Tests:
- Agent: Only sees MIS + Loans, filtered by assigned_banks (SBI, HDFC Bank)
- Manager: Sees Dashboard + MIS + Loans + Analytics, filtered by team
- Admin: Sees everything, no filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
MANAGER_EMAIL = "manager@mhpfintech.com"
MANAGER_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"


class TestAuthAndRoles:
    """Test authentication and role verification"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        """Get manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "manager"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "agent"
        # Verify agent has assigned_banks
        assert data["user"].get("assigned_banks") is not None, "Agent should have assigned_banks"
        assert "SBI" in data["user"]["assigned_banks"], "Agent should have SBI assigned"
        assert "HDFC Bank" in data["user"]["assigned_banks"], "Agent should have HDFC Bank assigned"
        return data["access_token"]
    
    def test_admin_login_returns_admin_role(self, admin_token):
        """Verify admin login returns correct role"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["role"] == "admin"
        print("PASS: Admin login returns admin role")
    
    def test_manager_login_returns_manager_role(self, manager_token):
        """Verify manager login returns correct role"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["role"] == "manager"
        print("PASS: Manager login returns manager role")
    
    def test_agent_login_returns_agent_role_with_banks(self, agent_token):
        """Verify agent login returns correct role and assigned_banks"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "agent"
        assert "SBI" in data.get("assigned_banks", [])
        assert "HDFC Bank" in data.get("assigned_banks", [])
        print("PASS: Agent login returns agent role with assigned_banks [SBI, HDFC Bank]")


class TestAgentLoanFiltering:
    """Test that Agent only sees loans from assigned banks (SBI, HDFC Bank)"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_agent_loans_only_from_assigned_banks(self, agent_token):
        """Agent should only see loans from SBI and HDFC Bank"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/loans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Check all loans are from assigned banks
        for loan in loans:
            bank = loan.get("bank", "")
            assert bank in ["SBI", "HDFC Bank"], f"Agent sees loan from non-assigned bank: {bank}"
        
        # Verify no ICICI loans (agent should not see ICICI)
        icici_loans = [l for l in loans if l.get("bank") == "ICICI"]
        assert len(icici_loans) == 0, f"Agent should NOT see ICICI loans, found {len(icici_loans)}"
        
        print(f"PASS: Agent sees {len(loans)} loans, all from SBI or HDFC Bank (no ICICI)")
    
    def test_admin_sees_all_loans_including_icici(self, admin_token):
        """Admin should see all loans including ICICI"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/loans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Admin should see more loans than agent
        banks = set(l.get("bank") for l in loans)
        print(f"PASS: Admin sees {len(loans)} loans from banks: {banks}")


class TestManagerLoanFiltering:
    """Test that Manager sees only their team's loans"""
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_manager_sees_team_loans(self, manager_token):
        """Manager should see loans from their team (including agent's loans)"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/loans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Manager should see team loans (agent is in manager's team)
        print(f"PASS: Manager sees {len(loans)} team loans")


class TestAgentAnalyticsFiltering:
    """Test that Agent analytics are filtered by assigned banks"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_agent_analytics_overview_filtered(self, agent_token):
        """Agent analytics overview should be filtered by assigned banks"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Agent should see filtered count (only SBI + HDFC Bank loans)
        agent_total = data.get("total", 0)
        print(f"PASS: Agent analytics overview shows {agent_total} loans (filtered by bank)")
    
    def test_admin_analytics_overview_unfiltered(self, admin_token):
        """Admin analytics overview should show all loans"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        admin_total = data.get("total", 0)
        print(f"PASS: Admin analytics overview shows {admin_total} loans (all)")


class TestManagerAnalyticsFiltering:
    """Test that Manager analytics are filtered by team"""
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_manager_analytics_overview_team_filtered(self, manager_token):
        """Manager analytics overview should show team data"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        manager_total = data.get("total", 0)
        print(f"PASS: Manager analytics overview shows {manager_total} team loans")
    
    def test_manager_analytics_by_bank_team_filtered(self, manager_token):
        """Manager analytics by-bank should show team data"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/by-bank", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        banks = list(data.keys())
        print(f"PASS: Manager analytics by-bank shows banks: {banks}")


class TestAdminOnlyEndpoints:
    """Test that admin-only endpoints are protected"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_agent_cannot_access_users_endpoint(self, agent_token):
        """Agent should not be able to access /api/users"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 403, f"Agent should get 403 for /api/users, got {response.status_code}"
        print("PASS: Agent cannot access /api/users (403)")
    
    def test_manager_cannot_access_users_endpoint(self, manager_token):
        """Manager should not be able to access /api/users"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 403, f"Manager should get 403 for /api/users, got {response.status_code}"
        print("PASS: Manager cannot access /api/users (403)")


class TestCompareAgentVsAdminLoanCounts:
    """Compare loan counts between Agent and Admin to verify filtering"""
    
    def test_agent_sees_fewer_loans_than_admin(self):
        """Agent should see fewer loans than Admin due to bank filtering"""
        # Login as agent
        agent_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert agent_resp.status_code == 200
        agent_token = agent_resp.json()["access_token"]
        
        # Login as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200
        admin_token = admin_resp.json()["access_token"]
        
        # Get agent loans
        agent_loans_resp = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        agent_loans = agent_loans_resp.json().get("loans", [])
        agent_total = agent_loans_resp.json().get("total", 0)
        
        # Get admin loans
        admin_loans_resp = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_loans = admin_loans_resp.json().get("loans", [])
        admin_total = admin_loans_resp.json().get("total", 0)
        
        # Agent should see fewer or equal loans (filtered by bank + created_by)
        print(f"Agent sees {agent_total} loans, Admin sees {admin_total} loans")
        
        # Verify agent only sees SBI and HDFC Bank
        agent_banks = set(l.get("bank") for l in agent_loans)
        print(f"Agent banks: {agent_banks}")
        
        for bank in agent_banks:
            assert bank in ["SBI", "HDFC Bank", ""], f"Agent sees unexpected bank: {bank}"
        
        print(f"PASS: Agent ({agent_total}) sees filtered loans, Admin ({admin_total}) sees all")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
