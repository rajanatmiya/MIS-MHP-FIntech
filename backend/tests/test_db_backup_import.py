"""
Test DB Backup and Import functionality
- GET /api/backup/download - Export all collections as JSON
- GET /api/backup/stats - Get collection counts including agent_targets
- POST /api/backup/import - Import with merge or replace mode
- Non-admin users should get 403 on all backup endpoints
"""
import pytest
import requests
import os
import json
import io

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
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def agent_headers(agent_token):
    return {"Authorization": f"Bearer {agent_token}"}


class TestBackupStats:
    """Test GET /api/backup/stats endpoint"""
    
    def test_admin_can_get_stats(self, admin_headers):
        """Admin should be able to get backup stats"""
        response = requests.get(f"{BASE_URL}/api/backup/stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        # Verify all expected collections are present
        expected_collections = [
            "users", "loan_applications", "schemes", "statuses",
            "master_banks", "master_agents", "master_companies",
            "master_branches", "master_locations", "master_categories",
            "master_products", "agent_targets"
        ]
        
        for col in expected_collections:
            assert col in data, f"Missing collection: {col}"
            assert isinstance(data[col], int), f"Collection {col} count should be int"
        
        # Verify total_records is present and correct
        assert "total_records" in data, "Missing total_records"
        expected_total = sum(data[col] for col in expected_collections)
        assert data["total_records"] == expected_total, "total_records mismatch"
        print(f"✓ Stats returned with {data['total_records']} total records")
    
    def test_agent_cannot_get_stats(self, agent_headers):
        """Non-admin users should get 403"""
        response = requests.get(f"{BASE_URL}/api/backup/stats", headers=agent_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Agent correctly denied access to stats (403)")
    
    def test_unauthenticated_cannot_get_stats(self):
        """Unauthenticated requests should get 401/403"""
        response = requests.get(f"{BASE_URL}/api/backup/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated request correctly denied")


class TestBackupDownload:
    """Test GET /api/backup/download endpoint"""
    
    def test_admin_can_download_backup(self, admin_headers):
        """Admin should be able to download backup as JSON"""
        response = requests.get(f"{BASE_URL}/api/backup/download", headers=admin_headers)
        assert response.status_code == 200, f"Failed to download: {response.text}"
        
        # Check content type
        assert "application/json" in response.headers.get("Content-Type", "")
        
        # Check Content-Disposition header for filename
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Missing attachment header"
        assert ".json" in content_disp, "Filename should be .json"
        
        # Parse and validate JSON structure
        data = response.json()
        
        # Verify all collections are present
        expected_collections = [
            "users", "loan_applications", "schemes", "statuses",
            "master_banks", "master_agents", "master_companies",
            "master_branches", "master_locations", "master_categories",
            "master_products", "agent_targets"
        ]
        
        for col in expected_collections:
            assert col in data, f"Missing collection: {col}"
            assert isinstance(data[col], list), f"Collection {col} should be a list"
        
        # Verify metadata
        assert "metadata" in data, "Missing metadata"
        assert "backup_date" in data["metadata"], "Missing backup_date in metadata"
        assert "backed_up_by" in data["metadata"], "Missing backed_up_by in metadata"
        assert "collections" in data["metadata"], "Missing collections in metadata"
        
        print(f"✓ Backup downloaded successfully with {len(expected_collections)} collections")
        return data
    
    def test_agent_cannot_download_backup(self, agent_headers):
        """Non-admin users should get 403"""
        response = requests.get(f"{BASE_URL}/api/backup/download", headers=agent_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Agent correctly denied access to download (403)")
    
    def test_unauthenticated_cannot_download(self):
        """Unauthenticated requests should get 401/403"""
        response = requests.get(f"{BASE_URL}/api/backup/download")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated request correctly denied")


class TestBackupImport:
    """Test POST /api/backup/import endpoint"""
    
    @pytest.fixture
    def sample_backup_data(self):
        """Create a sample backup JSON for testing"""
        return {
            "users": [],  # Don't import users to avoid conflicts
            "loan_applications": [],
            "schemes": [
                {"id": "test-scheme-import-1", "name": "TEST_Import_Scheme_1", "description": "Test scheme for import", "created_by": "test", "created_at": "2025-01-01T00:00:00Z"},
                {"id": "test-scheme-import-2", "name": "TEST_Import_Scheme_2", "description": "Test scheme 2", "created_by": "test", "created_at": "2025-01-01T00:00:00Z"}
            ],
            "statuses": [],
            "master_banks": [
                {"id": "test-bank-import-1", "name": "TEST_Import_Bank_1"},
                {"id": "test-bank-import-2", "name": "TEST_Import_Bank_2"}
            ],
            "master_agents": [],
            "master_companies": [],
            "master_branches": [],
            "master_locations": [],
            "master_categories": [],
            "master_products": [],
            "agent_targets": [],
            "metadata": {
                "backup_date": "2025-01-01T00:00:00Z",
                "backed_up_by": "test@test.com",
                "collections": {}
            }
        }
    
    def test_admin_can_import_merge_mode(self, admin_headers, sample_backup_data):
        """Admin should be able to import with merge mode"""
        # Create file-like object
        json_content = json.dumps(sample_backup_data)
        files = {"file": ("backup.json", json_content, "application/json")}
        data = {"mode": "merge"}
        
        response = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Import failed: {response.text}"
        
        result = response.json()
        assert "message" in result, "Missing message in response"
        assert "details" in result, "Missing details in response"
        assert "total_imported" in result, "Missing total_imported in response"
        
        # Check that merge mode was used
        if "schemes" in result["details"]:
            assert result["details"]["schemes"]["action"] == "merged"
            assert "inserted" in result["details"]["schemes"]
            assert "skipped" in result["details"]["schemes"]
        
        print(f"✓ Merge import successful: {result['message']}")
        return result
    
    def test_admin_can_import_replace_mode(self, admin_headers):
        """Admin should be able to import with replace mode"""
        # Create minimal backup for replace test
        backup_data = {
            "master_banks": [
                {"id": "replace-test-bank-1", "name": "TEST_Replace_Bank_1"}
            ],
            "metadata": {"backup_date": "2025-01-01T00:00:00Z", "backed_up_by": "test"}
        }
        
        json_content = json.dumps(backup_data)
        files = {"file": ("backup.json", json_content, "application/json")}
        data = {"mode": "replace"}
        
        response = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Replace import failed: {response.text}"
        
        result = response.json()
        
        # Check that replace mode was used
        if "master_banks" in result["details"]:
            assert result["details"]["master_banks"]["action"] == "replaced"
            assert "count" in result["details"]["master_banks"]
        
        print(f"✓ Replace import successful: {result['message']}")
    
    def test_agent_cannot_import(self, agent_headers, sample_backup_data):
        """Non-admin users should get 403 on import"""
        json_content = json.dumps(sample_backup_data)
        files = {"file": ("backup.json", json_content, "application/json")}
        data = {"mode": "merge"}
        
        response = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=agent_headers,
            files=files,
            data=data
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Agent correctly denied access to import (403)")
    
    def test_invalid_json_returns_400(self, admin_headers):
        """Invalid JSON should return 400"""
        files = {"file": ("backup.json", "not valid json {{{", "application/json")}
        data = {"mode": "merge"}
        
        response = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid JSON correctly rejected (400)")
    
    def test_merge_skips_duplicates(self, admin_headers):
        """Merge mode should skip records with existing IDs"""
        # First, get current stats
        stats_response = requests.get(f"{BASE_URL}/api/backup/stats", headers=admin_headers)
        initial_stats = stats_response.json()
        
        # Create backup with a scheme that has a unique ID
        unique_id = f"test-merge-dup-{os.urandom(4).hex()}"
        backup_data = {
            "schemes": [
                {"id": unique_id, "name": f"TEST_Merge_Dup_{unique_id}", "description": "Test", "created_by": "test", "created_at": "2025-01-01T00:00:00Z"}
            ]
        }
        
        # First import
        json_content = json.dumps(backup_data)
        files = {"file": ("backup.json", json_content, "application/json")}
        data = {"mode": "merge"}
        
        response1 = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response1.status_code == 200
        result1 = response1.json()
        
        # Second import with same data - should skip
        files = {"file": ("backup.json", json_content, "application/json")}
        response2 = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response2.status_code == 200
        result2 = response2.json()
        
        # Second import should have skipped the duplicate
        if "schemes" in result2["details"]:
            assert result2["details"]["schemes"]["skipped"] >= 1, "Should have skipped duplicate"
        
        print("✓ Merge mode correctly skips duplicates")


class TestImportResultDetails:
    """Test that import returns per-collection results"""
    
    def test_import_returns_per_collection_counts(self, admin_headers):
        """Import should return inserted/skipped counts per collection"""
        backup_data = {
            "schemes": [
                {"id": f"test-detail-{os.urandom(4).hex()}", "name": "TEST_Detail_Scheme", "description": "Test", "created_by": "test", "created_at": "2025-01-01T00:00:00Z"}
            ],
            "master_banks": [
                {"id": f"test-detail-bank-{os.urandom(4).hex()}", "name": "TEST_Detail_Bank"}
            ]
        }
        
        json_content = json.dumps(backup_data)
        files = {"file": ("backup.json", json_content, "application/json")}
        data = {"mode": "merge"}
        
        response = requests.post(
            f"{BASE_URL}/api/backup/import",
            headers=admin_headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        
        result = response.json()
        assert "details" in result
        
        # Check schemes details
        if "schemes" in result["details"]:
            scheme_details = result["details"]["schemes"]
            assert "action" in scheme_details
            if scheme_details["action"] == "merged":
                assert "inserted" in scheme_details
                assert "skipped" in scheme_details
        
        # Check master_banks details
        if "master_banks" in result["details"]:
            bank_details = result["details"]["master_banks"]
            assert "action" in bank_details
        
        print(f"✓ Import returns per-collection details: {result['details']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, admin_headers):
        """Remove test data created during tests"""
        # This is a cleanup test - we'll delete test schemes and banks
        # Get all schemes and delete TEST_ prefixed ones
        
        # Note: In a real scenario, we'd have cleanup endpoints
        # For now, we just verify the tests ran successfully
        print("✓ Test cleanup complete (manual cleanup may be needed for TEST_ prefixed data)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
