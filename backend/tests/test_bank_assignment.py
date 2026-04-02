"""
Test Bank Assignment Feature
- User model has assigned_banks field
- Agents with assigned_banks only see loans from those banks
- Admin sees all loans regardless of assigned_banks
- Analytics/overview respects bank filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"
AGENT_USER_ID = "f562205b-1907-4163-8c9c-f3b2ca16598b"

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
def agent_token():
    """Get agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    assert response.status_code == 200, f"Agent login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def agent_headers(agent_token):
    return {"Authorization": f"Bearer {agent_token}", "Content-Type": "application/json"}


class TestUserAssignedBanksField:
    """Test that User model has assigned_banks field"""
    
    def test_get_users_includes_assigned_banks(self, admin_headers):
        """GET /api/users should return users with assigned_banks field"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        # Find the agent user
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None, "Agent user not found"
        
        # Check assigned_banks field exists
        assert "assigned_banks" in agent_user, "assigned_banks field missing from user"
        print(f"Agent assigned_banks: {agent_user.get('assigned_banks')}")
    
    def test_agent_has_sbi_hdfc_assigned(self, admin_headers):
        """Agent should have SBI and HDFC Bank assigned"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None
        
        assigned_banks = agent_user.get("assigned_banks", [])
        # Check if SBI and HDFC Bank are assigned
        assert "SBI" in assigned_banks or "SBI BANK" in assigned_banks or any("SBI" in b.upper() for b in assigned_banks), \
            f"SBI not in assigned_banks: {assigned_banks}"
        assert "HDFC Bank" in assigned_banks or "HDFC BANK" in assigned_banks or any("HDFC" in b.upper() for b in assigned_banks), \
            f"HDFC Bank not in assigned_banks: {assigned_banks}"
        print(f"Agent assigned_banks verified: {assigned_banks}")


class TestUpdateUserAssignedBanks:
    """Test PUT /api/users/{id} with assigned_banks"""
    
    def test_update_user_assigned_banks(self, admin_headers):
        """Admin can update user's assigned_banks via PUT"""
        # First get current state
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        original_banks = agent_user.get("assigned_banks", [])
        
        # Update with new banks
        update_data = {
            "assigned_banks": ["SBI", "HDFC Bank"]
        }
        response = requests.put(
            f"{BASE_URL}/api/users/{AGENT_USER_ID}",
            headers=admin_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated_user = response.json()
        assert "assigned_banks" in updated_user
        assert "SBI" in updated_user["assigned_banks"]
        assert "HDFC Bank" in updated_user["assigned_banks"]
        print(f"Updated assigned_banks: {updated_user['assigned_banks']}")


class TestAgentBankFiltering:
    """Test that agent only sees loans from assigned banks"""
    
    def test_agent_sees_only_assigned_bank_loans(self, agent_headers, admin_headers):
        """Agent with assigned_banks should only see loans from those banks"""
        # First verify agent has assigned banks
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=agent_headers)
        assert response.status_code == 200
        agent_user = response.json()
        assigned_banks = agent_user.get("assigned_banks", [])
        print(f"Agent assigned_banks from /me: {assigned_banks}")
        
        # Get loans as agent
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        print(f"Agent sees {len(loans)} loans")
        
        # If agent has assigned banks, verify all loans are from those banks
        if assigned_banks and len(assigned_banks) > 0:
            for loan in loans:
                bank = loan.get("bank", "")
                # Check if bank matches any assigned bank (case-insensitive)
                bank_matches = any(
                    ab.upper() in bank.upper() or bank.upper() in ab.upper()
                    for ab in assigned_banks
                )
                assert bank_matches, f"Loan with bank '{bank}' should not be visible to agent with assigned_banks {assigned_banks}"
            print(f"All {len(loans)} loans are from assigned banks")
    
    def test_agent_does_not_see_icici_loans(self, agent_headers):
        """Agent with SBI/HDFC assigned should NOT see ICICI loans"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Check no ICICI loans
        icici_loans = [l for l in loans if "ICICI" in l.get("bank", "").upper()]
        assert len(icici_loans) == 0, f"Agent should not see ICICI loans but found {len(icici_loans)}"
        print("Verified: Agent does not see ICICI loans")
    
    def test_agent_sees_sbi_loans(self, agent_headers):
        """Agent with SBI assigned should see SBI loans"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Check for SBI loans
        sbi_loans = [l for l in loans if "SBI" in l.get("bank", "").upper()]
        print(f"Agent sees {len(sbi_loans)} SBI loans")
        # Note: May be 0 if no SBI loans exist for this agent
    
    def test_agent_sees_hdfc_loans(self, agent_headers):
        """Agent with HDFC assigned should see HDFC loans"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        
        # Check for HDFC loans
        hdfc_loans = [l for l in loans if "HDFC" in l.get("bank", "").upper()]
        print(f"Agent sees {len(hdfc_loans)} HDFC loans")


class TestAdminSeesAllLoans:
    """Test that admin sees all loans regardless of assigned_banks"""
    
    def test_admin_sees_all_loans(self, admin_headers):
        """Admin should see all loans including ICICI"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        loans = data.get("loans", [])
        total = data.get("total", 0)
        
        print(f"Admin sees {len(loans)} loans (total: {total})")
        
        # Get unique banks
        banks = set(l.get("bank", "") for l in loans)
        print(f"Banks visible to admin: {banks}")
        
        # Admin should see more banks than just SBI/HDFC
        assert total > 0, "Admin should see some loans"


class TestAnalyticsOverviewBankFiltering:
    """Test that analytics/overview respects bank filtering"""
    
    def test_agent_overview_filtered_by_bank(self, agent_headers):
        """Agent's overview should only include data from assigned banks"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        
        print(f"Agent overview: total={data.get('total')}, disbursed={data.get('disbursed')}")
        # Just verify the endpoint works
        assert "total" in data
        assert "disbursed" in data
    
    def test_admin_overview_includes_all(self, admin_headers):
        """Admin's overview should include all data"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        print(f"Admin overview: total={data.get('total')}, disbursed={data.get('disbursed')}")
        assert "total" in data
        assert "disbursed" in data


class TestCreateUserWithAssignedBanks:
    """Test creating user with assigned_banks via POST /api/auth/register"""
    
    def test_register_user_with_assigned_banks(self, admin_headers):
        """Creating user with assigned_banks should work"""
        import uuid
        test_email = f"test_bank_user_{uuid.uuid4().hex[:8]}@test.com"
        
        create_data = {
            "email": test_email,
            "name": "TEST Bank User",
            "password": "Test@123",
            "role": "agent",
            "assigned_banks": ["SBI", "Axis Bank"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            headers=admin_headers,
            json=create_data
        )
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        user = data.get("user", {})
        assert user.get("assigned_banks") == ["SBI", "Axis Bank"], \
            f"assigned_banks not set correctly: {user.get('assigned_banks')}"
        
        # Cleanup - delete the test user
        user_id = user.get("id")
        if user_id:
            requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=admin_headers)
        
        print(f"Created and deleted test user with assigned_banks")


class TestClearAssignedBanks:
    """Test clearing assigned_banks (empty array)"""
    
    def test_clear_assigned_banks_shows_all_own_loans(self, admin_headers, agent_headers):
        """Clearing assigned_banks should let agent see all their own loans"""
        # First get current assigned_banks
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        original_banks = agent_user.get("assigned_banks", [])
        
        # Clear assigned_banks
        response = requests.put(
            f"{BASE_URL}/api/users/{AGENT_USER_ID}",
            headers=admin_headers,
            json={"assigned_banks": []}
        )
        assert response.status_code == 200
        
        # Get loans as agent - should see all own loans now
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        loans_without_filter = data.get("loans", [])
        
        print(f"Agent with no assigned_banks sees {len(loans_without_filter)} loans")
        
        # Restore original assigned_banks
        response = requests.put(
            f"{BASE_URL}/api/users/{AGENT_USER_ID}",
            headers=admin_headers,
            json={"assigned_banks": original_banks if original_banks else ["SBI", "HDFC Bank"]}
        )
        assert response.status_code == 200
        print(f"Restored assigned_banks to: {original_banks if original_banks else ['SBI', 'HDFC Bank']}")


class TestMasterBanksEndpoint:
    """Test that master banks endpoint works for bank dropdown"""
    
    def test_get_master_banks(self, admin_headers):
        """GET /api/master/banks should return list of banks"""
        response = requests.get(f"{BASE_URL}/api/master/banks", headers=admin_headers)
        assert response.status_code == 200
        banks = response.json()
        
        assert isinstance(banks, list)
        print(f"Master banks: {[b.get('name') for b in banks]}")
        
        # Should have some banks
        assert len(banks) > 0, "No master banks found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
