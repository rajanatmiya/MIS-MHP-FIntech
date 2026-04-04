"""
Test suite for Team Leaderboard and Agent Onboarding features
- GET /api/analytics/team-leaderboard: Returns agent performance leaderboard
- POST /api/auth/register: Creates new user (used by onboarding wizard)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTeamLeaderboard:
    """Team Performance Leaderboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin and manager tokens"""
        # Admin login
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@mhpfintech.com",
            "password": "Admin@123"
        })
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        self.admin_token = admin_resp.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Manager login
        manager_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@mhpfintech.com",
            "password": "Admin@123"
        })
        assert manager_resp.status_code == 200, f"Manager login failed: {manager_resp.text}"
        self.manager_token = manager_resp.json()["access_token"]
        self.manager_headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Agent login
        agent_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@mhpfintech.com",
            "password": "Admin@123"
        })
        assert agent_resp.status_code == 200, f"Agent login failed: {agent_resp.text}"
        self.agent_token = agent_resp.json()["access_token"]
        self.agent_headers = {"Authorization": f"Bearer {self.agent_token}"}
    
    def test_admin_can_access_leaderboard(self):
        """Admin should be able to access team leaderboard"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard' key"
        assert "total_agents" in data, "Response should contain 'total_agents' key"
        assert "total_loans" in data, "Response should contain 'total_loans' key"
        assert isinstance(data["leaderboard"], list), "Leaderboard should be a list"
    
    def test_manager_can_access_leaderboard(self):
        """Manager should be able to access team leaderboard"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.manager_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard' key"
    
    def test_agent_can_access_leaderboard(self):
        """Agent should also be able to access leaderboard (API doesn't restrict)"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.agent_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_leaderboard_entry_structure(self):
        """Verify leaderboard entry has all required fields"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            required_fields = ["agent_name", "total_loans", "sanction_amount", "disbursed_amount", 
                             "disbursed_count", "rank", "conversion_rate"]
            for field in required_fields:
                assert field in entry, f"Leaderboard entry missing field: {field}"
            
            # Verify rank is 1 for first entry
            assert entry["rank"] == 1, f"First entry should have rank 1, got {entry['rank']}"
            
            # Verify conversion_rate is a number
            assert isinstance(entry["conversion_rate"], (int, float)), "conversion_rate should be numeric"
    
    def test_leaderboard_sorted_by_disbursed_amount(self):
        """Verify leaderboard is sorted by disbursed_amount descending"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        if len(leaderboard) > 1:
            for i in range(len(leaderboard) - 1):
                assert leaderboard[i]["disbursed_amount"] >= leaderboard[i+1]["disbursed_amount"], \
                    f"Leaderboard not sorted correctly at index {i}"
    
    def test_leaderboard_ranks_are_sequential(self):
        """Verify ranks are sequential starting from 1"""
        response = requests.get(f"{BASE_URL}/api/analytics/team-leaderboard", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        for i, entry in enumerate(leaderboard):
            expected_rank = i + 1
            assert entry["rank"] == expected_rank, f"Expected rank {expected_rank}, got {entry['rank']}"


class TestAgentOnboarding:
    """Agent Onboarding (user registration) tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and master data"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@mhpfintech.com",
            "password": "Admin@123"
        })
        assert admin_resp.status_code == 200
        self.admin_token = admin_resp.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Track created users for cleanup
        self.created_user_ids = []
    
    def teardown_method(self, method):
        """Cleanup: Delete test users created during tests"""
        for user_id in self.created_user_ids:
            try:
                requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.admin_headers)
            except:
                pass
    
    def test_register_basic_agent(self):
        """Test creating a basic agent via register endpoint"""
        unique_email = f"TEST_agent_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "TEST New Agent",
            "password": "TestPass123",
            "role": "agent"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "TEST New Agent"
        assert data["user"]["role"] == "agent"
        
        self.created_user_ids.append(data["user"]["id"])
    
    def test_register_agent_with_team_code(self):
        """Test creating agent with team code"""
        unique_email = f"TEST_agent_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "TEST Team Agent",
            "password": "TestPass123",
            "role": "agent",
            "team_code": "TEAM-A"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["team_code"] == "TEAM-A"
        
        self.created_user_ids.append(data["user"]["id"])
    
    def test_register_agent_with_assigned_banks(self):
        """Test creating agent with assigned banks"""
        unique_email = f"TEST_agent_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "TEST Bank Agent",
            "password": "TestPass123",
            "role": "agent",
            "assigned_banks": ["SBI", "HDFC Bank"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["assigned_banks"] == ["SBI", "HDFC Bank"]
        
        self.created_user_ids.append(data["user"]["id"])
    
    def test_register_agent_with_categories_and_products(self):
        """Test creating agent with assigned categories and products"""
        unique_email = f"TEST_agent_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "TEST Full Agent",
            "password": "TestPass123",
            "role": "agent",
            "assigned_categories": ["SECURED", "UNSECURED"],
            "assigned_products": ["Home Loan", "Personal Loan"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["assigned_categories"] == ["SECURED", "UNSECURED"]
        assert data["user"]["assigned_products"] == ["Home Loan", "Personal Loan"]
        
        self.created_user_ids.append(data["user"]["id"])
    
    def test_register_manager(self):
        """Test creating a manager via register endpoint"""
        unique_email = f"TEST_manager_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "TEST New Manager",
            "password": "TestPass123",
            "role": "manager",
            "team_code": "TEAM-B"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "manager"
        assert data["user"]["team_code"] == "TEAM-B"
        
        self.created_user_ids.append(data["user"]["id"])
    
    def test_register_duplicate_email_fails(self):
        """Test that registering with existing email fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@mhpfintech.com",  # Existing email
            "name": "Duplicate User",
            "password": "TestPass123",
            "role": "agent"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        assert "already registered" in response.json().get("detail", "").lower()
    
    def test_master_banks_available(self):
        """Test that master banks are available for onboarding"""
        response = requests.get(f"{BASE_URL}/api/master/banks", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        banks = response.json()
        assert isinstance(banks, list), "Banks should be a list"
        assert len(banks) > 0, "Should have at least one bank"
        
        # Verify bank structure
        if len(banks) > 0:
            assert "id" in banks[0], "Bank should have id"
            assert "name" in banks[0], "Bank should have name"
    
    def test_master_categories_available(self):
        """Test that master categories are available for onboarding"""
        response = requests.get(f"{BASE_URL}/api/master/categories", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Categories should be a list"
        assert len(categories) > 0, "Should have at least one category"
    
    def test_master_products_available(self):
        """Test that master products are available for onboarding"""
        response = requests.get(f"{BASE_URL}/api/master/products", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        assert len(products) > 0, "Should have at least one product"
    
    def test_users_list_for_manager_selection(self):
        """Test that users list is available for manager selection"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Users should be a list"
        
        # Check if there are managers in the list
        managers = [u for u in users if u.get("role") == "manager"]
        assert len(managers) > 0, "Should have at least one manager for selection"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
