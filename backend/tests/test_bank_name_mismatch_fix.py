"""
Test P0 Bug Fix: Bank Name Mismatch Issue
Tests that agents/managers see ALL their own/team loans regardless of bank name mismatches.

Key fix: build_rbac_filter now returns simple created_by filters:
- Agent: {"created_by": user.id}
- Manager: {"created_by": {"$in": accessible_ids}}
No bank/cat/prod filtering in queries anymore.

Test scenarios:
- Agent with assigned_banks=['HERO','YES'] sees loan with bank='YES BANK' (mismatch)
- Agent sees ALL their own loans regardless of assigned_banks/categories/products
- Manager sees ALL team loans regardless of their own assigned_banks/categories/products
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Production test credentials
ADMIN_EMAIL = "admin@mhpfintech.com"
ADMIN_PASSWORD = "Admin@123"

# Dhruvi - Agent with assigned_banks: HERO, YES (but has loan with bank='YES BANK')
DHRUVI_EMAIL = "dhruvi.shah@mhpfintech.com"
DHRUVI_PASSWORD = "Dhruvi@MHP"
DHRUVI_ID = "151b6678-0964-4f40-b90d-34fd5ccc596e"

# Jyoti - Manager (Dhruvi's manager)
JYOTI_EMAIL = "jyoti.tripathi@mhpfintech.com"
JYOTI_PASSWORD = "Jyoti@MHP"
JYOTI_ID = "6214205a-c465-4a04-8ce0-e6d4b1936b96"

# Test agent with different assigned banks
TEST_AGENT_EMAIL = "agent@mhpfintech.com"
TEST_AGENT_PASSWORD = "Admin@123"


class TestBankNameMismatchFix:
    """Test P0 Bug Fix: Bank name mismatch handling"""
    
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
    
    def _get_user_info(self, token):
        """Get current user info"""
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def _create_test_loan(self, token, bank, category="", product="", customer_prefix="TEST_"):
        """Create a test loan with specified bank"""
        loan_data = {
            "agent_name": "Test Agent",
            "customer_name": f"{customer_prefix}Customer_{uuid.uuid4().hex[:8]}",
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
    
    # ==================== P0 BUG FIX: BANK NAME MISMATCH TESTS ====================
    
    def test_dhruvi_login_and_check_assigned_banks(self):
        """Verify Dhruvi's assigned_banks contains 'YES' but not 'YES BANK'"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        user = self._get_user_info(token)
        assert user is not None, "Failed to get user info"
        
        assigned_banks = user.get("assigned_banks", [])
        print(f"Dhruvi's assigned_banks: {assigned_banks}")
        
        # Verify YES is in assigned_banks but YES BANK is not
        assert "YES" in assigned_banks, "Dhruvi should have 'YES' in assigned_banks"
        assert "YES BANK" not in assigned_banks, "Dhruvi should NOT have 'YES BANK' in assigned_banks (this is the mismatch)"
        print(f"✓ Dhruvi has 'YES' but not 'YES BANK' in assigned_banks - mismatch scenario confirmed")
    
    def test_dhruvi_sees_loan_with_bank_yes_bank(self):
        """P0 BUG FIX: Dhruvi (assigned_banks=['YES']) sees loan with bank='YES BANK'"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        # Get Dhruvi's loans
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        
        # Find loan with bank='YES BANK'
        yes_bank_loans = [l for l in loans if l.get("bank") == "YES BANK"]
        
        assert len(yes_bank_loans) > 0, "P0 BUG NOT FIXED: Dhruvi cannot see loan with bank='YES BANK' despite having 'YES' in assigned_banks"
        
        print(f"✓ P0 BUG FIX VERIFIED: Dhruvi sees {len(yes_bank_loans)} loan(s) with bank='YES BANK'")
        print(f"  Loan details: {yes_bank_loans[0].get('customer_name')}, bank={yes_bank_loans[0].get('bank')}")
    
    def test_dhruvi_sees_all_her_own_loans(self):
        """Agent sees ALL their own loans regardless of assigned_banks/categories/products"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        # Get Dhruvi's loans
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        total = data.get("total", 0)
        
        # Verify all loans are created by Dhruvi
        for loan in loans:
            assert loan.get("created_by") == DHRUVI_ID, f"Loan {loan.get('id')} not created by Dhruvi"
        
        print(f"✓ Dhruvi sees ALL {total} of her own loans")
        
        # Check banks in her loans
        banks = set(l.get("bank") for l in loans)
        print(f"  Banks in her loans: {banks}")
        
        # Verify she has loans with different banks (including mismatched ones)
        assert total >= 2, "Dhruvi should have at least 2 loans for this test"
    
    def test_jyoti_sees_all_team_loans(self):
        """Manager sees ALL team loans regardless of their own assigned_banks/categories/products"""
        token = self._login(JYOTI_EMAIL, JYOTI_PASSWORD)
        assert token is not None, "Jyoti login failed"
        
        # Get Jyoti's team loans
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        total = data.get("total", 0)
        
        print(f"✓ Jyoti (manager) sees {total} team loans")
        
        # Check if Dhruvi's loans are visible
        dhruvi_loans = [l for l in loans if l.get("created_by") == DHRUVI_ID]
        print(f"  Dhruvi's loans visible to Jyoti: {len(dhruvi_loans)}")
        
        assert len(dhruvi_loans) >= 2, "Jyoti should see at least 2 of Dhruvi's loans"
        
        # Verify Jyoti sees the loan with bank='YES BANK' (mismatch scenario)
        yes_bank_loans = [l for l in dhruvi_loans if l.get("bank") == "YES BANK"]
        assert len(yes_bank_loans) > 0, "P0 BUG NOT FIXED: Jyoti cannot see Dhruvi's loan with bank='YES BANK'"
        print(f"✓ P0 BUG FIX VERIFIED: Jyoti sees Dhruvi's loan with bank='YES BANK'")
    
    def test_agent_creates_loan_with_mismatched_bank_and_sees_it(self):
        """Agent creates loan with bank not in assigned_banks and still sees it"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        # Create loan with bank that's NOT in Dhruvi's assigned_banks
        # Dhruvi has: HERO, YES, POONAWALLA, CLIX, MUTHOOTH, UNITY
        # Create with bank="ICICI BANK" which is NOT in her list
        loan = self._create_test_loan(token, bank="ICICI BANK", customer_prefix="TEST_MISMATCH_")
        assert loan is not None, "Failed to create test loan"
        
        print(f"Created loan with bank='ICICI BANK' (not in Dhruvi's assigned_banks)")
        
        # Verify Dhruvi can see this loan
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        loans = data.get("loans", [])
        loan_ids = [l["id"] for l in loans]
        
        assert loan["id"] in loan_ids, "P0 BUG NOT FIXED: Agent cannot see loan with bank not in assigned_banks"
        print(f"✓ P0 BUG FIX VERIFIED: Dhruvi sees loan with bank='ICICI BANK' (not in her assigned_banks)")
    
    # ==================== ANALYTICS ENDPOINTS WITH RBAC ====================
    
    def test_dhruvi_analytics_overview(self):
        """Test /api/analytics/overview returns correct data for Dhruvi"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/overview failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in overview response"
        assert data["total"] >= 2, "Dhruvi should see at least 2 loans in analytics"
        print(f"✓ Dhruvi analytics overview - total: {data.get('total')}")
    
    def test_dhruvi_analytics_unique_values(self):
        """Test /api/analytics/unique-values returns correct data for Dhruvi"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/unique-values",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/unique-values failed: {response.status_code}"
        
        data = response.json()
        banks = data.get("banks", [])
        
        # Verify 'YES BANK' is in the unique values (from her loan)
        assert "YES BANK" in banks, "Dhruvi's unique-values should include 'YES BANK' from her loan"
        print(f"✓ Dhruvi analytics unique-values - banks: {banks}")
    
    def test_dhruvi_analytics_team_leaderboard(self):
        """Test /api/analytics/team-leaderboard returns correct data for Dhruvi"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/team-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/team-leaderboard failed: {response.status_code}"
        
        data = response.json()
        assert "leaderboard" in data, "Missing 'leaderboard' in response"
        assert "total_loans" in data, "Missing 'total_loans' in response"
        print(f"✓ Dhruvi analytics team-leaderboard - total_loans: {data.get('total_loans')}")
    
    def test_jyoti_analytics_overview(self):
        """Test /api/analytics/overview returns correct team data for Jyoti"""
        token = self._login(JYOTI_EMAIL, JYOTI_PASSWORD)
        assert token is not None, "Jyoti login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/analytics/overview failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in overview response"
        assert data["total"] >= 2, "Jyoti should see at least 2 team loans in analytics"
        print(f"✓ Jyoti analytics overview - total: {data.get('total')}")
    
    # ==================== SEARCH FUNCTIONALITY ====================
    
    def test_dhruvi_search_by_customer_name(self):
        """Test search functionality works for agents"""
        token = self._login(DHRUVI_EMAIL, DHRUVI_PASSWORD)
        assert token is not None, "Dhruvi login failed"
        
        # Search for "Ekta" (from Dhruvi's loan "Ekta Shah Test")
        response = self.session.get(
            f"{BASE_URL}/api/loans?search=Ekta",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/loans?search=Ekta failed: {response.status_code}"
        
        data = response.json()
        loans = data.get("loans", [])
        
        # Should find the loan with customer_name containing "Ekta"
        ekta_loans = [l for l in loans if "Ekta" in l.get("customer_name", "")]
        assert len(ekta_loans) > 0, "Search should find loan with 'Ekta' in customer name"
        print(f"✓ Dhruvi search works - found {len(ekta_loans)} loan(s) with 'Ekta'")
    
    # ==================== ADMIN VISIBILITY ====================
    
    def test_admin_sees_all_loans(self):
        """Admin sees all loans in the system"""
        token = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token is not None, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/loans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/loans failed: {response.status_code}"
        
        data = response.json()
        total = data.get("total", 0)
        
        print(f"✓ Admin sees all {total} loans in the system")
        assert total >= 2, "Admin should see at least 2 loans"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
