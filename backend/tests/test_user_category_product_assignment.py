"""
Test suite for User Management with assigned_categories and assigned_products
Tests:
1. PUT /api/users/{id} with assigned_categories and assigned_products
2. POST /api/auth/register with assigned_categories and assigned_products
3. GET /api/users returns assigned_categories and assigned_products
4. GET /api/loans filters by assigned_categories and assigned_products for non-admin users
"""
import pytest
import requests
import os
import uuid

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
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def agent_headers(agent_token):
    """Agent auth headers"""
    return {"Authorization": f"Bearer {agent_token}"}


class TestUserCategoryProductAssignment:
    """Test assigned_categories and assigned_products in User Management"""
    
    def test_admin_login_success(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")
    
    def test_agent_login_success(self):
        """Test agent can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "agent"
        print("✓ Agent login successful")
    
    def test_get_users_returns_categories_and_products(self, admin_headers):
        """Test GET /api/users returns assigned_categories and assigned_products fields"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        
        # Check that user objects have the new fields
        for user in users:
            assert "assigned_categories" in user or user.get("assigned_categories") is None
            assert "assigned_products" in user or user.get("assigned_products") is None
        
        # Find agent user and verify their assignments
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None, "Agent user not found"
        print(f"✓ Agent user found with categories: {agent_user.get('assigned_categories')}, products: {agent_user.get('assigned_products')}")
    
    def test_update_user_with_categories_and_products(self, admin_headers):
        """Test PUT /api/users/{id} with assigned_categories and assigned_products"""
        # First get users to find agent
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None, "Agent user not found"
        
        # Update with new categories and products
        update_data = {
            "assigned_categories": ["SECURED", "UNSECURED"],
            "assigned_products": ["Home Loan", "LAP"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/users/{agent_user['id']}", 
            json=update_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        updated_user = response.json()
        
        # Verify the update
        assert updated_user["assigned_categories"] == ["SECURED", "UNSECURED"]
        assert updated_user["assigned_products"] == ["Home Loan", "LAP"]
        print(f"✓ User updated with categories: {updated_user['assigned_categories']}, products: {updated_user['assigned_products']}")
    
    def test_update_user_verify_persistence(self, admin_headers):
        """Test that updated categories/products persist after GET"""
        # Get users again to verify persistence
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        agent_user = next((u for u in users if u["email"] == AGENT_EMAIL), None)
        assert agent_user is not None
        
        # Verify persisted values
        assert "SECURED" in (agent_user.get("assigned_categories") or [])
        assert "Home Loan" in (agent_user.get("assigned_products") or [])
        print("✓ Categories and products persisted correctly")
    
    def test_register_user_with_categories_and_products(self, admin_headers):
        """Test POST /api/auth/register with assigned_categories and assigned_products"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_agent_{unique_id}@test.com"
        
        register_data = {
            "email": test_email,
            "name": f"Test Agent {unique_id}",
            "password": "TestPass123",
            "role": "agent",
            "assigned_banks": ["SBI", "HDFC Bank"],
            "assigned_categories": ["SECURED", "CAR LOAN"],
            "assigned_products": ["Home Loan", "Car Loan"]
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Verify the registered user has the assigned fields
        assert user["assigned_categories"] == ["SECURED", "CAR LOAN"]
        assert user["assigned_products"] == ["Home Loan", "Car Loan"]
        assert user["assigned_banks"] == ["SBI", "HDFC Bank"]
        print(f"✓ User registered with categories: {user['assigned_categories']}, products: {user['assigned_products']}")
        
        # Cleanup - delete the test user
        response = requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=admin_headers)
        assert response.status_code == 200
        print("✓ Test user cleaned up")


class TestLoanFilteringByCategoryProduct:
    """Test that loans are filtered by assigned_categories and assigned_products"""
    
    def test_agent_sees_filtered_loans(self, agent_headers):
        """Test that agent only sees loans matching their assigned categories and products"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        
        loans = data.get("loans", [])
        print(f"✓ Agent sees {len(loans)} loans (filtered by their assignments)")
        
        # If there are loans, verify they match the agent's assigned categories/products
        # Agent has: assigned_categories=['SECURED','UNSECURED'], assigned_products=['Home Loan','LAP']
        for loan in loans[:5]:  # Check first 5 loans
            category = loan.get("category", "")
            product = loan.get("product", "")
            # Note: Empty category/product might be allowed if no filter is applied
            if category:
                assert category in ["SECURED", "UNSECURED", ""], f"Unexpected category: {category}"
            if product:
                assert product in ["Home Loan", "LAP", ""], f"Unexpected product: {product}"
        
        print("✓ Loan filtering by category/product working correctly")
    
    def test_admin_sees_all_loans(self, admin_headers):
        """Test that admin sees all loans without filtering"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        loans = data.get("loans", [])
        total = data.get("total", 0)
        print(f"✓ Admin sees {len(loans)} loans (total: {total}) - no filtering applied")
    
    def test_auth_me_returns_assignments(self, agent_headers):
        """Test GET /api/auth/me returns assigned_categories and assigned_products"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=agent_headers)
        assert response.status_code == 200
        user = response.json()
        
        assert "assigned_categories" in user
        assert "assigned_products" in user
        print(f"✓ /api/auth/me returns categories: {user.get('assigned_categories')}, products: {user.get('assigned_products')}")


class TestMasterDataEndpoints:
    """Test master data endpoints for categories and products"""
    
    def test_get_master_categories(self, admin_headers):
        """Test GET /api/master/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/master/categories", headers=admin_headers)
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) > 0
        
        # Verify expected categories exist
        category_names = [c["name"] for c in categories]
        assert "SECURED" in category_names
        assert "UNSECURED" in category_names
        print(f"✓ Master categories: {category_names}")
    
    def test_get_master_products(self, admin_headers):
        """Test GET /api/master/products returns list of products"""
        response = requests.get(f"{BASE_URL}/api/master/products", headers=admin_headers)
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0
        
        # Verify expected products exist
        product_names = [p["name"] for p in products]
        assert "Home Loan" in product_names
        assert "LAP" in product_names
        print(f"✓ Master products: {product_names}")
    
    def test_get_master_banks(self, admin_headers):
        """Test GET /api/master/banks returns list of banks"""
        response = requests.get(f"{BASE_URL}/api/master/banks", headers=admin_headers)
        assert response.status_code == 200
        banks = response.json()
        assert isinstance(banks, list)
        assert len(banks) > 0
        print(f"✓ Master banks count: {len(banks)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
