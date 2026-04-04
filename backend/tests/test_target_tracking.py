"""
Test Monthly Target Tracking Feature
- POST /api/targets: Set target for agent_name+month (creates or updates)
- GET /api/targets: Returns all targets (optionally filtered by month)
- DELETE /api/targets/{agent_name}/{month}: Removes a target
- GET /api/analytics/team-leaderboard: Includes target_amount and target_progress fields
- Role-based access: Only admin/manager can set/delete targets (agent gets 403)
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


class TestTargetCRUD:
    """Test CRUD operations for agent targets"""
    
    def test_admin_can_create_target(self, admin_token):
        """Admin can create a new target for an agent"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Agent_Target",
                "month": "04-2026",
                "target_amount": 1500000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create target: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["agent_name"] == "TEST_Agent_Target"
        assert data["month"] == "04-2026"
        assert data["target_amount"] == 1500000
        print("PASS: Admin can create target")
    
    def test_manager_can_create_target(self, manager_token):
        """Manager can create a new target for an agent"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Manager_Target",
                "month": "04-2026",
                "target_amount": 2000000
            },
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Failed to create target: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["agent_name"] == "TEST_Manager_Target"
        print("PASS: Manager can create target")
    
    def test_agent_cannot_create_target(self, agent_token):
        """Agent should get 403 when trying to create a target"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Agent_Forbidden",
                "month": "04-2026",
                "target_amount": 500000
            },
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Agent gets 403 when trying to create target")
    
    def test_admin_can_update_target(self, admin_token):
        """Admin can update an existing target (upsert behavior)"""
        # First create
        requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Update_Target",
                "month": "04-2026",
                "target_amount": 1000000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Then update
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Update_Target",
                "month": "04-2026",
                "target_amount": 1200000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["target_amount"] == 1200000
        print("PASS: Admin can update existing target")
    
    def test_get_all_targets(self, admin_token):
        """GET /api/targets returns all targets"""
        response = requests.get(
            f"{BASE_URL}/api/targets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/targets returns {len(data)} targets")
    
    def test_get_targets_filtered_by_month(self, admin_token):
        """GET /api/targets?month=04-2026 returns filtered targets"""
        response = requests.get(
            f"{BASE_URL}/api/targets?month=04-2026",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned targets should have the specified month
        for target in data:
            assert target.get("month") == "04-2026"
        print(f"PASS: GET /api/targets?month=04-2026 returns {len(data)} filtered targets")
    
    def test_target_has_required_fields(self, admin_token):
        """Target object has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/targets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            target = data[0]
            required_fields = ["agent_name", "month", "target_amount"]
            for field in required_fields:
                assert field in target, f"Missing field: {field}"
            print(f"PASS: Target has required fields: {required_fields}")
        else:
            print("SKIP: No targets to verify fields")
    
    def test_admin_can_delete_target(self, admin_token):
        """Admin can delete a target"""
        # First create a target to delete
        requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Delete_Target",
                "month": "04-2026",
                "target_amount": 500000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/targets/TEST_Delete_Target/04-2026",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        print("PASS: Admin can delete target")
    
    def test_manager_can_delete_target(self, manager_token, admin_token):
        """Manager can delete a target"""
        # First create a target to delete
        requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Manager_Delete",
                "month": "04-2026",
                "target_amount": 600000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Manager deletes it
        response = requests.delete(
            f"{BASE_URL}/api/targets/TEST_Manager_Delete/04-2026",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        print("PASS: Manager can delete target")
    
    def test_agent_cannot_delete_target(self, agent_token, admin_token):
        """Agent should get 403 when trying to delete a target"""
        # First create a target
        requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Agent_Delete_Forbidden",
                "month": "04-2026",
                "target_amount": 700000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Agent tries to delete
        response = requests.delete(
            f"{BASE_URL}/api/targets/TEST_Agent_Delete_Forbidden/04-2026",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Agent gets 403 when trying to delete target")


class TestLeaderboardWithTargets:
    """Test team leaderboard includes target data"""
    
    def test_leaderboard_returns_target_fields(self, admin_token):
        """Leaderboard entries include target_amount and target_progress"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/team-leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        
        leaderboard = data["leaderboard"]
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            assert "target_amount" in entry, "Missing target_amount field"
            assert "target_progress" in entry, "Missing target_progress field"
            print(f"PASS: Leaderboard entry has target_amount={entry['target_amount']}, target_progress={entry['target_progress']}")
        else:
            print("SKIP: No leaderboard entries to verify")
    
    def test_leaderboard_with_month_filter(self, admin_token):
        """Leaderboard can be filtered by month"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/team-leaderboard?month=04-2026",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"PASS: Leaderboard with month filter returns {len(data['leaderboard'])} agents")
    
    def test_target_progress_calculation(self, admin_token):
        """Target progress is calculated correctly (disbursed_amount / target_amount * 100)"""
        # Create a target for a known agent
        requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "Test Agent",
                "month": "04-2026",
                "target_amount": 1000000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/analytics/team-leaderboard?month=04-2026",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Test Agent in leaderboard
        test_agent = None
        for agent in data["leaderboard"]:
            if agent["agent_name"] == "Test Agent":
                test_agent = agent
                break
        
        if test_agent and test_agent["target_amount"] > 0:
            expected_progress = round((test_agent["disbursed_amount"] / test_agent["target_amount"]) * 100, 1)
            assert test_agent["target_progress"] == expected_progress, \
                f"Expected progress {expected_progress}, got {test_agent['target_progress']}"
            print(f"PASS: Target progress calculated correctly: {test_agent['target_progress']}%")
        else:
            print("SKIP: Test Agent not found or no target set")
    
    def test_leaderboard_has_all_required_fields(self, admin_token):
        """Leaderboard entry has all required fields including target fields"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/team-leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "agent_name", "total_loans", "sanction_amount", "disbursed_amount",
            "disbursed_count", "rank", "conversion_rate", "target_amount", "target_progress"
        ]
        
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            for field in required_fields:
                assert field in entry, f"Missing field: {field}"
            print(f"PASS: Leaderboard entry has all required fields")
        else:
            print("SKIP: No leaderboard entries")


class TestTargetValidation:
    """Test target input validation"""
    
    def test_target_requires_agent_name(self, admin_token):
        """Target creation requires agent_name"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "month": "04-2026",
                "target_amount": 1000000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Target creation requires agent_name")
    
    def test_target_requires_month(self, admin_token):
        """Target creation requires month"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_No_Month",
                "target_amount": 1000000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Target creation requires month")
    
    def test_target_amount_defaults_to_zero(self, admin_token):
        """Target amount defaults to 0 if not provided"""
        response = requests.post(
            f"{BASE_URL}/api/targets",
            json={
                "agent_name": "TEST_Default_Amount",
                "month": "04-2026"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["target_amount"] == 0
        print("PASS: Target amount defaults to 0")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/targets/TEST_Default_Amount/04-2026",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_targets(self, admin_token):
        """Remove all TEST_ prefixed targets"""
        response = requests.get(
            f"{BASE_URL}/api/targets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            targets = response.json()
            for target in targets:
                if target.get("agent_name", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/targets/{target['agent_name']}/{target['month']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
        print("PASS: Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
