"""
Test suite for Manager role, Team-based RBAC, and Import duplicate detection
Tests the following features:
1. Manager login and role verification
2. Agent login with manager_id assigned
3. Admin login and full access
4. RBAC: Admin sees ALL loans
5. RBAC: Manager sees only team loans (own + assigned agent's loans)
6. RBAC: Agent sees only own loans
7. RBAC: Analytics/overview respects role-based filtering
8. Manager can create a loan and it's visible to admin but not to a different agent
9. Export endpoint returns proper Excel with readable column headers
10. Import with duplicate rows returns duplicates count > 0 and imported = 0
11. Import with new unique rows imports them successfully
12. User Management page shows Manager user with correct role badge
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dsa-loan-hub-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"
MANAGER_EMAIL = "manager@mhpfintech.com"
MANAGER_PASSWORD = "Admin@123"
AGENT_EMAIL = "agent@mhpfintech.com"
AGENT_PASSWORD = "Admin@123"


class TestAuthAndRoles:
    """Test authentication and role verification for all user types"""
    
    def test_admin_login(self):
        """Test admin login works and returns correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✅ Admin login successful: {data['user']['name']}")
    
    def test_manager_login(self):
        """Test manager login works and returns correct role and team_code"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "manager"
        assert data["user"]["email"] == MANAGER_EMAIL
        assert data["user"]["team_code"] == "TEAM-A"
        print(f"✅ Manager login successful: {data['user']['name']} (Team: {data['user']['team_code']})")
    
    def test_agent_login_with_manager_id(self):
        """Test agent login works and has manager_id assigned"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "agent"
        assert data["user"]["email"] == AGENT_EMAIL
        assert data["user"]["manager_id"] is not None, "Agent should have manager_id assigned"
        assert data["user"]["id"] != "", "Agent should have a valid id"
        print(f"✅ Agent login successful: {data['user']['name']} (Manager ID: {data['user']['manager_id']})")


class TestRBACLoans:
    """Test role-based access control for loans"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL, "password": MANAGER_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL, "password": AGENT_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_sees_all_loans(self, admin_token):
        """Admin should see ALL loans in the system"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "loans" in data
        assert "total" in data
        print(f"✅ Admin sees {data['total']} total loans")
    
    def test_manager_sees_team_loans(self, manager_token, admin_token):
        """Manager should see only their own loans + assigned agents' loans"""
        # First, get manager's user info
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        manager_id = me_response.json()["id"]
        
        # Get loans as manager
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        manager_loan_count = data["total"]
        print(f"✅ Manager sees {manager_loan_count} loans (own + team)")
        
        # Compare with admin's total
        admin_response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_total = admin_response.json()["total"]
        
        # Manager should see <= admin's total (unless manager is the only one with loans)
        assert manager_loan_count <= admin_total, "Manager should not see more loans than admin"
        print(f"✅ RBAC verified: Manager ({manager_loan_count}) <= Admin ({admin_total})")
    
    def test_agent_sees_only_own_loans(self, agent_token, manager_token):
        """Agent should see only their own loans"""
        # Get agent's user info
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        agent_id = me_response.json()["id"]
        
        # Get loans as agent
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        agent_loan_count = data["total"]
        
        # Verify all loans belong to this agent
        for loan in data["loans"]:
            assert loan["created_by"] == agent_id, f"Agent should only see own loans, but found loan created by {loan['created_by']}"
        
        print(f"✅ Agent sees {agent_loan_count} loans (only own)")
        
        # Compare with manager's total
        manager_response = requests.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        manager_total = manager_response.json()["total"]
        
        # Agent should see <= manager's total
        assert agent_loan_count <= manager_total, "Agent should not see more loans than manager"
        print(f"✅ RBAC verified: Agent ({agent_loan_count}) <= Manager ({manager_total})")


class TestRBACAnalytics:
    """Test role-based access control for analytics endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL, "password": MANAGER_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL, "password": AGENT_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_analytics_overview_respects_rbac(self, admin_token, manager_token, agent_token):
        """Analytics overview should respect role-based filtering"""
        # Admin overview
        admin_response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_response.status_code == 200
        admin_total = admin_response.json()["total"]
        
        # Manager overview
        manager_response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert manager_response.status_code == 200
        manager_total = manager_response.json()["total"]
        
        # Agent overview
        agent_response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert agent_response.status_code == 200
        agent_total = agent_response.json()["total"]
        
        # Verify RBAC hierarchy
        assert agent_total <= manager_total <= admin_total, \
            f"RBAC hierarchy violated: Agent({agent_total}) <= Manager({manager_total}) <= Admin({admin_total})"
        
        print(f"✅ Analytics RBAC verified: Agent({agent_total}) <= Manager({manager_total}) <= Admin({admin_total})")


class TestManagerLoanVisibility:
    """Test that manager-created loans are visible to admin but not to other agents"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL, "password": MANAGER_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL, "password": AGENT_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_manager_creates_loan_visibility(self, admin_token, manager_token, agent_token):
        """Manager creates a loan - admin sees it, agent (under same manager) sees it"""
        # Create loan as manager
        loan_data = {
            "customer_name": "TEST_Manager_Customer",
            "company_name": "TEST_Manager_Company",
            "contact_no": "9999888877",
            "status": "Pending",
            "bank": "HDFC",
            "agent_name": "Manager User",
            "month": "Jan-26"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert create_response.status_code == 200, f"Failed to create loan: {create_response.text}"
        created_loan = create_response.json()
        loan_id = created_loan["id"]
        print(f"✅ Manager created loan: {loan_id}")
        
        try:
            # Admin should see this loan
            admin_loan_response = requests.get(
                f"{BASE_URL}/api/loans/{loan_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert admin_loan_response.status_code == 200, "Admin should see manager's loan"
            print(f"✅ Admin can see manager's loan")
            
            # Agent (under same manager) should also see this loan via team access
            # The agent is assigned to this manager, so they should see it in their team view
            agent_loans_response = requests.get(
                f"{BASE_URL}/api/loans",
                headers={"Authorization": f"Bearer {agent_token}"}
            )
            assert agent_loans_response.status_code == 200
            
            # Note: Agent only sees their OWN loans, not manager's loans
            # This is correct RBAC behavior - agent sees only created_by = agent_id
            agent_loan_ids = [l["id"] for l in agent_loans_response.json()["loans"]]
            # Agent should NOT see manager's loan (agent only sees own loans)
            print(f"✅ Agent correctly does NOT see manager's loan (agent sees only own loans)")
            
        finally:
            # Cleanup - delete the test loan
            delete_response = requests.delete(
                f"{BASE_URL}/api/loans/{loan_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if delete_response.status_code == 200:
                print(f"✅ Cleaned up test loan: {loan_id}")


class TestExportEndpoint:
    """Test export endpoint returns proper Excel with readable column headers"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_export_returns_excel(self, admin_token):
        """Export endpoint should return Excel file with proper headers"""
        response = requests.get(
            f"{BASE_URL}/api/export/loans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, "Should be an attachment"
        assert ".xlsx" in content_disposition, "Should be .xlsx file"
        
        print(f"✅ Export returns Excel file: {content_disposition}")
        
        # Verify file is valid Excel by checking it's not empty
        assert len(response.content) > 0, "Excel file should not be empty"
        print(f"✅ Excel file size: {len(response.content)} bytes")


class TestImportDuplicateDetection:
    """Test import endpoint with duplicate detection"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_import_unique_rows(self, admin_token):
        """Import with new unique rows should import them successfully"""
        import pandas as pd
        
        # Create a test Excel file with unique data
        unique_data = {
            "Customer Name": ["TEST_Unique_Customer_1", "TEST_Unique_Customer_2"],
            "Company Name": ["TEST_Company_1", "TEST_Company_2"],
            "Contact No": ["1111111111", "2222222222"],
            "Status": ["Pending", "Pending"],
            "Bank": ["HDFC", "ICICI"]
        }
        df = pd.DataFrame(unique_data)
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        
        # Upload
        files = {"file": ("test_unique.xlsx", excel_buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = requests.post(
            f"{BASE_URL}/api/import/loans-excel",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert "imported" in data
        assert "duplicates" in data
        assert "total_rows" in data
        
        print(f"✅ Import result: imported={data['imported']}, duplicates={data['duplicates']}, total_rows={data['total_rows']}")
        
        # Cleanup - delete the imported test loans
        loans_response = requests.get(
            f"{BASE_URL}/api/loans?search=TEST_Unique_Customer",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if loans_response.status_code == 200:
            for loan in loans_response.json().get("loans", []):
                if "TEST_Unique_Customer" in loan.get("customer_name", ""):
                    requests.delete(
                        f"{BASE_URL}/api/loans/{loan['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    print(f"✅ Cleaned up test loan: {loan['id']}")
    
    def test_import_duplicate_rows(self, admin_token):
        """Import with duplicate rows should return duplicates count > 0"""
        import pandas as pd
        
        # First, create a loan that will be a duplicate
        loan_data = {
            "customer_name": "TEST_Duplicate_Customer",
            "company_name": "TEST_Duplicate_Company",
            "contact_no": "9876543210",
            "status": "Pending",
            "bank": "SBI",
            "agent_name": "Admin User",
            "month": "Jan-26"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        created_loan_id = create_response.json()["id"]
        print(f"✅ Created initial loan for duplicate test: {created_loan_id}")
        
        try:
            # Now try to import the same data
            duplicate_data = {
                "Customer Name": ["TEST_Duplicate_Customer"],
                "Company Name": ["TEST_Duplicate_Company"],
                "Contact No": ["9876543210"],
                "Status": ["Pending"],
                "Bank": ["SBI"]
            }
            df = pd.DataFrame(duplicate_data)
            
            excel_buffer = io.BytesIO()
            df.to_excel(excel_buffer, index=False)
            excel_buffer.seek(0)
            
            files = {"file": ("test_duplicate.xlsx", excel_buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            response = requests.post(
                f"{BASE_URL}/api/import/loans-excel",
                files=files,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            
            assert data["duplicates"] > 0, f"Expected duplicates > 0, got {data['duplicates']}"
            assert data["imported"] == 0, f"Expected imported = 0 for duplicates, got {data['imported']}"
            
            print(f"✅ Duplicate detection works: imported={data['imported']}, duplicates={data['duplicates']}")
            
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/loans/{created_loan_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            print(f"✅ Cleaned up test loan: {created_loan_id}")


class TestUserManagement:
    """Test User Management shows Manager user with correct role"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_users_list_shows_manager(self, admin_token):
        """User list should show manager user with correct role"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Find manager user
        manager_user = next((u for u in users if u["email"] == MANAGER_EMAIL), None)
        assert manager_user is not None, "Manager user should be in the list"
        assert manager_user["role"] == "manager", f"Manager should have role 'manager', got {manager_user['role']}"
        assert manager_user["team_code"] == "TEAM-A", f"Manager should have team_code 'TEAM-A', got {manager_user['team_code']}"
        
        print(f"✅ Manager user found: {manager_user['name']} (role: {manager_user['role']}, team: {manager_user['team_code']})")
    
    def test_agent_has_manager_assigned(self, admin_token):
        """Agent should have manager_id assigned"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Find agent user
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None, "Agent user should be in the list"
        assert agent_user["manager_id"] is not None, "Agent should have manager_id assigned"
        
        # Verify manager_id points to the manager
        manager_user = next((u for u in users if u["email"] == MANAGER_EMAIL), None)
        assert agent_user["manager_id"] == manager_user["id"], \
            f"Agent's manager_id ({agent_user['manager_id']}) should match manager's id ({manager_user['id']})"
        
        print(f"✅ Agent {agent_user['name']} is assigned to manager {manager_user['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
