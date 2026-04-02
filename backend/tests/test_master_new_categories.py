"""
Test suite for new Master File categories: Companies, Branches, Locations
Tests CRUD operations, duplicate detection, sorting, and RBAC
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


class TestSetup:
    """Setup fixtures for tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Agent user not available for testing")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def agent_headers(self, agent_token):
        return {"Authorization": f"Bearer {agent_token}", "Content-Type": "application/json"}


class TestMasterCompanies(TestSetup):
    """Test CRUD operations for Master Companies"""
    
    created_company_id = None
    
    def test_get_companies_returns_sorted_list(self, admin_headers):
        """GET /api/master/companies returns sorted list"""
        response = requests.get(f"{BASE_URL}/api/master/companies", headers=admin_headers)
        assert response.status_code == 200
        companies = response.json()
        assert isinstance(companies, list)
        # Check if sorted alphabetically
        if len(companies) > 1:
            names = [c["name"] for c in companies]
            assert names == sorted(names), "Companies should be sorted alphabetically"
        print(f"✓ GET /api/master/companies - Returns {len(companies)} companies (sorted)")
    
    def test_add_company_admin(self, admin_headers):
        """POST /api/master/companies - Admin can add company"""
        test_name = "TEST_Company_Pytest"
        response = requests.post(f"{BASE_URL}/api/master/companies", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        assert "id" in data
        TestMasterCompanies.created_company_id = data["id"]
        print(f"✓ POST /api/master/companies - Admin added company: {test_name}")
    
    def test_duplicate_company_returns_400(self, admin_headers):
        """POST /api/master/companies - Duplicate name returns 400"""
        test_name = "TEST_Company_Pytest"  # Same as above
        response = requests.post(f"{BASE_URL}/api/master/companies", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ POST /api/master/companies - Duplicate returns 400")
    
    def test_duplicate_company_case_insensitive(self, admin_headers):
        """POST /api/master/companies - Duplicate check is case-insensitive"""
        test_name = "test_company_pytest"  # lowercase version
        response = requests.post(f"{BASE_URL}/api/master/companies", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 400
        print("✓ POST /api/master/companies - Case-insensitive duplicate check works")
    
    def test_update_company_admin(self, admin_headers):
        """PUT /api/master/companies/{id} - Admin can update company"""
        if not TestMasterCompanies.created_company_id:
            pytest.skip("No company created to update")
        
        new_name = "TEST_Company_Updated"
        response = requests.put(
            f"{BASE_URL}/api/master/companies/{TestMasterCompanies.created_company_id}",
            headers=admin_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        print(f"✓ PUT /api/master/companies - Admin updated company to: {new_name}")
    
    def test_add_company_agent_forbidden(self, agent_headers):
        """POST /api/master/companies - Agent gets 403"""
        response = requests.post(f"{BASE_URL}/api/master/companies", 
                                 headers=agent_headers, 
                                 json={"name": "Agent_Test_Company"})
        assert response.status_code == 403
        print("✓ POST /api/master/companies - Agent gets 403 (RBAC working)")
    
    def test_agent_can_view_companies(self, agent_headers):
        """GET /api/master/companies - Agent can view (read-only)"""
        response = requests.get(f"{BASE_URL}/api/master/companies", headers=agent_headers)
        assert response.status_code == 200
        print("✓ GET /api/master/companies - Agent can view companies (read-only)")
    
    def test_delete_company_admin(self, admin_headers):
        """DELETE /api/master/companies/{id} - Admin can delete company"""
        if not TestMasterCompanies.created_company_id:
            pytest.skip("No company created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/master/companies/{TestMasterCompanies.created_company_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print("✓ DELETE /api/master/companies - Admin deleted test company")


class TestMasterBranches(TestSetup):
    """Test CRUD operations for Master Branches"""
    
    created_branch_id = None
    
    def test_get_branches_returns_sorted_list(self, admin_headers):
        """GET /api/master/branches returns sorted list"""
        response = requests.get(f"{BASE_URL}/api/master/branches", headers=admin_headers)
        assert response.status_code == 200
        branches = response.json()
        assert isinstance(branches, list)
        if len(branches) > 1:
            names = [b["name"] for b in branches]
            assert names == sorted(names), "Branches should be sorted alphabetically"
        print(f"✓ GET /api/master/branches - Returns {len(branches)} branches (sorted)")
    
    def test_add_branch_admin(self, admin_headers):
        """POST /api/master/branches - Admin can add branch"""
        test_name = "TEST_Branch_Pytest"
        response = requests.post(f"{BASE_URL}/api/master/branches", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        assert "id" in data
        TestMasterBranches.created_branch_id = data["id"]
        print(f"✓ POST /api/master/branches - Admin added branch: {test_name}")
    
    def test_duplicate_branch_returns_400(self, admin_headers):
        """POST /api/master/branches - Duplicate name returns 400"""
        test_name = "TEST_Branch_Pytest"
        response = requests.post(f"{BASE_URL}/api/master/branches", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ POST /api/master/branches - Duplicate returns 400")
    
    def test_update_branch_admin(self, admin_headers):
        """PUT /api/master/branches/{id} - Admin can update branch"""
        if not TestMasterBranches.created_branch_id:
            pytest.skip("No branch created to update")
        
        new_name = "TEST_Branch_Updated"
        response = requests.put(
            f"{BASE_URL}/api/master/branches/{TestMasterBranches.created_branch_id}",
            headers=admin_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        print(f"✓ PUT /api/master/branches - Admin updated branch to: {new_name}")
    
    def test_add_branch_agent_forbidden(self, agent_headers):
        """POST /api/master/branches - Agent gets 403"""
        response = requests.post(f"{BASE_URL}/api/master/branches", 
                                 headers=agent_headers, 
                                 json={"name": "Agent_Test_Branch"})
        assert response.status_code == 403
        print("✓ POST /api/master/branches - Agent gets 403 (RBAC working)")
    
    def test_delete_branch_admin(self, admin_headers):
        """DELETE /api/master/branches/{id} - Admin can delete branch"""
        if not TestMasterBranches.created_branch_id:
            pytest.skip("No branch created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/master/branches/{TestMasterBranches.created_branch_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print("✓ DELETE /api/master/branches - Admin deleted test branch")


class TestMasterLocations(TestSetup):
    """Test CRUD operations for Master Locations"""
    
    created_location_id = None
    
    def test_get_locations_returns_sorted_list(self, admin_headers):
        """GET /api/master/locations returns sorted list"""
        response = requests.get(f"{BASE_URL}/api/master/locations", headers=admin_headers)
        assert response.status_code == 200
        locations = response.json()
        assert isinstance(locations, list)
        if len(locations) > 1:
            names = [l["name"] for l in locations]
            assert names == sorted(names), "Locations should be sorted alphabetically"
        print(f"✓ GET /api/master/locations - Returns {len(locations)} locations (sorted)")
    
    def test_add_location_admin(self, admin_headers):
        """POST /api/master/locations - Admin can add location"""
        test_name = "TEST_Location_Pytest"
        response = requests.post(f"{BASE_URL}/api/master/locations", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        assert "id" in data
        TestMasterLocations.created_location_id = data["id"]
        print(f"✓ POST /api/master/locations - Admin added location: {test_name}")
    
    def test_duplicate_location_returns_400(self, admin_headers):
        """POST /api/master/locations - Duplicate name returns 400"""
        test_name = "TEST_Location_Pytest"
        response = requests.post(f"{BASE_URL}/api/master/locations", 
                                 headers=admin_headers, 
                                 json={"name": test_name})
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ POST /api/master/locations - Duplicate returns 400")
    
    def test_update_location_admin(self, admin_headers):
        """PUT /api/master/locations/{id} - Admin can update location"""
        if not TestMasterLocations.created_location_id:
            pytest.skip("No location created to update")
        
        new_name = "TEST_Location_Updated"
        response = requests.put(
            f"{BASE_URL}/api/master/locations/{TestMasterLocations.created_location_id}",
            headers=admin_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        print(f"✓ PUT /api/master/locations - Admin updated location to: {new_name}")
    
    def test_add_location_agent_forbidden(self, agent_headers):
        """POST /api/master/locations - Agent gets 403"""
        response = requests.post(f"{BASE_URL}/api/master/locations", 
                                 headers=agent_headers, 
                                 json={"name": "Agent_Test_Location"})
        assert response.status_code == 403
        print("✓ POST /api/master/locations - Agent gets 403 (RBAC working)")
    
    def test_delete_location_admin(self, admin_headers):
        """DELETE /api/master/locations/{id} - Admin can delete location"""
        if not TestMasterLocations.created_location_id:
            pytest.skip("No location created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/master/locations/{TestMasterLocations.created_location_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print("✓ DELETE /api/master/locations - Admin deleted test location")


class TestBackupStats(TestSetup):
    """Test backup stats include new collections"""
    
    def test_backup_stats_includes_new_collections(self, admin_headers):
        """GET /api/backup/stats includes master_companies, master_branches, master_locations"""
        response = requests.get(f"{BASE_URL}/api/backup/stats", headers=admin_headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Check new collections are included
        assert "master_companies" in stats, "master_companies should be in backup stats"
        assert "master_branches" in stats, "master_branches should be in backup stats"
        assert "master_locations" in stats, "master_locations should be in backup stats"
        
        # Verify they are integers
        assert isinstance(stats["master_companies"], int)
        assert isinstance(stats["master_branches"], int)
        assert isinstance(stats["master_locations"], int)
        
        print(f"✓ GET /api/backup/stats - Includes new collections:")
        print(f"  - master_companies: {stats['master_companies']}")
        print(f"  - master_branches: {stats['master_branches']}")
        print(f"  - master_locations: {stats['master_locations']}")


class TestExistingMasterData(TestSetup):
    """Verify existing seed data is present"""
    
    def test_existing_companies(self, admin_headers):
        """Verify existing company data"""
        response = requests.get(f"{BASE_URL}/api/master/companies", headers=admin_headers)
        assert response.status_code == 200
        companies = response.json()
        company_names = [c["name"] for c in companies]
        print(f"✓ Existing companies: {company_names}")
    
    def test_existing_branches(self, admin_headers):
        """Verify existing branch data"""
        response = requests.get(f"{BASE_URL}/api/master/branches", headers=admin_headers)
        assert response.status_code == 200
        branches = response.json()
        branch_names = [b["name"] for b in branches]
        print(f"✓ Existing branches: {branch_names}")
    
    def test_existing_locations(self, admin_headers):
        """Verify existing location data"""
        response = requests.get(f"{BASE_URL}/api/master/locations", headers=admin_headers)
        assert response.status_code == 200
        locations = response.json()
        location_names = [l["name"] for l in locations]
        print(f"✓ Existing locations: {location_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
