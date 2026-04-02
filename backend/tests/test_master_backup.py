"""
Test Master File and DB Backup Features - Iteration 6
Tests:
- Master File CRUD for Banks and Agents
- DB Backup stats and download
- Dropdown integration in MIS and Loan forms
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


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def agent_token():
    """Get agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Agent authentication failed")


@pytest.fixture
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture
def agent_client(agent_token):
    """Session with agent auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {agent_token}"
    })
    return session


class TestMasterBanks:
    """Test Master Banks CRUD operations"""
    
    def test_get_master_banks(self, admin_client):
        """GET /api/master/banks returns list of banks"""
        response = admin_client.get(f"{BASE_URL}/api/master/banks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} master banks")
    
    def test_add_master_bank_admin(self, admin_client):
        """POST /api/master/banks - Admin can add bank"""
        test_bank_name = "TEST_Bank_Iteration6"
        response = admin_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": test_bank_name
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_bank_name
        assert "id" in data
        print(f"Created bank: {data['name']} with id: {data['id']}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/master/banks/{data['id']}")
    
    def test_add_duplicate_bank_returns_400(self, admin_client):
        """POST /api/master/banks - Duplicate bank name returns 400"""
        test_bank_name = "TEST_Duplicate_Bank"
        # Create first bank
        response1 = admin_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": test_bank_name
        })
        assert response1.status_code == 200
        bank_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = admin_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": test_bank_name
        })
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        print("Duplicate bank correctly rejected with 400")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/master/banks/{bank_id}")
    
    def test_update_master_bank(self, admin_client):
        """PUT /api/master/banks/{id} - Admin can update bank"""
        # Create bank first
        response = admin_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": "TEST_Bank_ToUpdate"
        })
        assert response.status_code == 200
        bank_id = response.json()["id"]
        
        # Update bank
        new_name = "TEST_Bank_Updated"
        update_response = admin_client.put(f"{BASE_URL}/api/master/banks/{bank_id}", json={
            "name": new_name
        })
        assert update_response.status_code == 200
        assert update_response.json()["name"] == new_name
        print(f"Bank updated to: {new_name}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/master/banks/{bank_id}")
    
    def test_delete_master_bank(self, admin_client):
        """DELETE /api/master/banks/{id} - Admin can delete bank"""
        # Create bank first
        response = admin_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": "TEST_Bank_ToDelete"
        })
        assert response.status_code == 200
        bank_id = response.json()["id"]
        
        # Delete bank
        delete_response = admin_client.delete(f"{BASE_URL}/api/master/banks/{bank_id}")
        assert delete_response.status_code == 200
        print("Bank deleted successfully")
        
        # Verify deletion
        get_response = admin_client.get(f"{BASE_URL}/api/master/banks")
        banks = get_response.json()
        assert not any(b["id"] == bank_id for b in banks)
    
    def test_agent_cannot_add_bank(self, agent_client):
        """POST /api/master/banks - Agent gets 403"""
        response = agent_client.post(f"{BASE_URL}/api/master/banks", json={
            "name": "TEST_Agent_Bank"
        })
        assert response.status_code == 403
        print("Agent correctly denied from adding bank (403)")
    
    def test_agent_can_view_banks(self, agent_client):
        """GET /api/master/banks - Agent can view banks"""
        response = agent_client.get(f"{BASE_URL}/api/master/banks")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("Agent can view master banks")


class TestMasterAgents:
    """Test Master Agents CRUD operations"""
    
    def test_get_master_agents(self, admin_client):
        """GET /api/master/agents returns list of agents"""
        response = admin_client.get(f"{BASE_URL}/api/master/agents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} master agents")
    
    def test_add_master_agent_admin(self, admin_client):
        """POST /api/master/agents - Admin can add agent"""
        test_agent_name = "TEST_Agent_Iteration6"
        response = admin_client.post(f"{BASE_URL}/api/master/agents", json={
            "name": test_agent_name
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_agent_name
        assert "id" in data
        print(f"Created agent: {data['name']} with id: {data['id']}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/master/agents/{data['id']}")
    
    def test_update_master_agent(self, admin_client):
        """PUT /api/master/agents/{id} - Admin can update agent"""
        # Create agent first
        response = admin_client.post(f"{BASE_URL}/api/master/agents", json={
            "name": "TEST_Agent_ToUpdate"
        })
        assert response.status_code == 200
        agent_id = response.json()["id"]
        
        # Update agent
        new_name = "TEST_Agent_Updated"
        update_response = admin_client.put(f"{BASE_URL}/api/master/agents/{agent_id}", json={
            "name": new_name
        })
        assert update_response.status_code == 200
        assert update_response.json()["name"] == new_name
        print(f"Agent updated to: {new_name}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/master/agents/{agent_id}")
    
    def test_delete_master_agent(self, admin_client):
        """DELETE /api/master/agents/{id} - Admin can delete agent"""
        # Create agent first
        response = admin_client.post(f"{BASE_URL}/api/master/agents", json={
            "name": "TEST_Agent_ToDelete"
        })
        assert response.status_code == 200
        agent_id = response.json()["id"]
        
        # Delete agent
        delete_response = admin_client.delete(f"{BASE_URL}/api/master/agents/{agent_id}")
        assert delete_response.status_code == 200
        print("Agent deleted successfully")
    
    def test_agent_cannot_add_agent(self, agent_client):
        """POST /api/master/agents - Agent gets 403"""
        response = agent_client.post(f"{BASE_URL}/api/master/agents", json={
            "name": "TEST_Agent_ByAgent"
        })
        assert response.status_code == 403
        print("Agent correctly denied from adding agent (403)")


class TestDBBackup:
    """Test DB Backup functionality"""
    
    def test_get_backup_stats_admin(self, admin_client):
        """GET /api/backup/stats - Admin can get stats"""
        response = admin_client.get(f"{BASE_URL}/api/backup/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert "users" in data
        assert "loan_applications" in data
        assert "master_banks" in data
        assert "master_agents" in data
        print(f"Backup stats: total_records={data['total_records']}")
        print(f"  users={data.get('users', 0)}, loans={data.get('loan_applications', 0)}")
        print(f"  master_banks={data.get('master_banks', 0)}, master_agents={data.get('master_agents', 0)}")
    
    def test_download_backup_admin(self, admin_client):
        """GET /api/backup/download - Admin can download backup"""
        response = admin_client.get(f"{BASE_URL}/api/backup/download")
        assert response.status_code == 200
        assert "application/json" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        
        # Verify JSON structure
        data = response.json()
        assert "metadata" in data
        assert "users" in data
        assert "loan_applications" in data
        assert "master_banks" in data
        assert "master_agents" in data
        print(f"Backup downloaded successfully, metadata: {data['metadata']}")
    
    def test_agent_cannot_get_backup_stats(self, agent_client):
        """GET /api/backup/stats - Agent gets 403"""
        response = agent_client.get(f"{BASE_URL}/api/backup/stats")
        assert response.status_code == 403
        print("Agent correctly denied from backup stats (403)")
    
    def test_agent_cannot_download_backup(self, agent_client):
        """GET /api/backup/download - Agent gets 403"""
        response = agent_client.get(f"{BASE_URL}/api/backup/download")
        assert response.status_code == 403
        print("Agent correctly denied from backup download (403)")


class TestMasterDataInForms:
    """Test that master data appears in forms"""
    
    def test_master_banks_sorted(self, admin_client):
        """Master banks are returned sorted by name"""
        response = admin_client.get(f"{BASE_URL}/api/master/banks")
        assert response.status_code == 200
        banks = response.json()
        if len(banks) > 1:
            names = [b["name"] for b in banks]
            assert names == sorted(names), "Banks should be sorted alphabetically"
            print("Banks are sorted alphabetically")
    
    def test_master_agents_sorted(self, admin_client):
        """Master agents are returned sorted by name"""
        response = admin_client.get(f"{BASE_URL}/api/master/agents")
        assert response.status_code == 200
        agents = response.json()
        if len(agents) > 1:
            names = [a["name"] for a in agents]
            assert names == sorted(names), "Agents should be sorted alphabetically"
            print("Agents are sorted alphabetically")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
