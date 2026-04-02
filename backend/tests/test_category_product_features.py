"""
Test Category and Product Features
- GET /api/master/categories returns list of categories
- GET /api/master/products returns list of products
- POST /api/loans with category and product fields
- PUT /api/loans/{id} with category and product fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoryProductFeatures:
    """Test Category and Product API endpoints and loan integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@mhpfintech.com",
            "password": "Admin@123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    # --- Master Categories Tests ---
    def test_get_master_categories_returns_list(self):
        """GET /api/master/categories should return list of categories"""
        response = self.session.get(f"{BASE_URL}/api/master/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one category"
        
        # Verify structure of category objects
        first_category = data[0]
        assert "id" in first_category, "Category should have 'id' field"
        assert "name" in first_category, "Category should have 'name' field"
        print(f"✓ Found {len(data)} categories: {[c['name'] for c in data]}")
    
    def test_master_categories_contains_expected_values(self):
        """Verify seeded categories exist"""
        response = self.session.get(f"{BASE_URL}/api/master/categories")
        assert response.status_code == 200
        
        data = response.json()
        category_names = [c['name'] for c in data]
        
        # Check for expected seeded categories
        expected_categories = ['SECURED', 'UNSECURED']
        for expected in expected_categories:
            assert expected in category_names, f"Expected category '{expected}' not found in {category_names}"
        print(f"✓ Expected categories found: {expected_categories}")
    
    # --- Master Products Tests ---
    def test_get_master_products_returns_list(self):
        """GET /api/master/products should return list of products"""
        response = self.session.get(f"{BASE_URL}/api/master/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one product"
        
        # Verify structure of product objects
        first_product = data[0]
        assert "id" in first_product, "Product should have 'id' field"
        assert "name" in first_product, "Product should have 'name' field"
        print(f"✓ Found {len(data)} products: {[p['name'] for p in data]}")
    
    def test_master_products_contains_expected_values(self):
        """Verify seeded products exist"""
        response = self.session.get(f"{BASE_URL}/api/master/products")
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p['name'] for p in data]
        
        # Check for expected seeded products
        expected_products = ['Home Loan', 'Personal Loan']
        for expected in expected_products:
            assert expected in product_names, f"Expected product '{expected}' not found in {product_names}"
        print(f"✓ Expected products found: {expected_products}")
    
    # --- Loan Creation with Category/Product ---
    def test_create_loan_with_category_and_product(self):
        """POST /api/loans with category and product fields should succeed"""
        # Get a valid category and product
        categories_resp = self.session.get(f"{BASE_URL}/api/master/categories")
        products_resp = self.session.get(f"{BASE_URL}/api/master/products")
        
        categories = categories_resp.json()
        products = products_resp.json()
        
        test_category = categories[0]['name'] if categories else 'SECURED'
        test_product = products[0]['name'] if products else 'Home Loan'
        
        # Create loan with category and product
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_CategoryProduct_Customer",
            "company_name": "TEST_Company",
            "contact_no": "9876543210",
            "status": "Login Done",
            "bank": "SBI",
            "category": test_category,
            "product": test_product,
            "month": "01-04-2026"
        }
        
        response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_loan = response.json()
        assert "id" in created_loan, "Created loan should have 'id'"
        assert created_loan.get("category") == test_category, f"Category mismatch: expected {test_category}, got {created_loan.get('category')}"
        assert created_loan.get("product") == test_product, f"Product mismatch: expected {test_product}, got {created_loan.get('product')}"
        
        self.created_loan_id = created_loan["id"]
        print(f"✓ Created loan with category='{test_category}', product='{test_product}'")
        
        # Verify by GET
        get_response = self.session.get(f"{BASE_URL}/api/loans/{self.created_loan_id}")
        assert get_response.status_code == 200
        fetched_loan = get_response.json()
        assert fetched_loan.get("category") == test_category
        assert fetched_loan.get("product") == test_product
        print(f"✓ Verified loan persisted with correct category and product")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/loans/{self.created_loan_id}")
    
    def test_create_loan_with_empty_category_product(self):
        """POST /api/loans with empty category and product should succeed"""
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_EmptyCatProd_Customer",
            "company_name": "TEST_Company",
            "contact_no": "9876543211",
            "status": "Login Done",
            "bank": "HDFC Bank",
            "category": "",
            "product": "",
            "month": "02-04-2026"
        }
        
        response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_loan = response.json()
        assert created_loan.get("category") == "", "Empty category should be preserved"
        assert created_loan.get("product") == "", "Empty product should be preserved"
        
        print(f"✓ Created loan with empty category and product")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/loans/{created_loan['id']}")
    
    # --- Loan Update with Category/Product ---
    def test_update_loan_category_and_product(self):
        """PUT /api/loans/{id} with category and product fields should succeed"""
        # First create a loan
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_UpdateCatProd_Customer",
            "company_name": "TEST_Company",
            "contact_no": "9876543212",
            "status": "Login Done",
            "bank": "SBI",
            "category": "SECURED",
            "product": "Home Loan",
            "month": "03-04-2026"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert create_response.status_code == 200
        loan_id = create_response.json()["id"]
        
        # Update category and product
        update_data = {
            "category": "UNSECURED",
            "product": "Personal Loan"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_loan = update_response.json()
        assert updated_loan.get("category") == "UNSECURED", f"Category not updated: {updated_loan.get('category')}"
        assert updated_loan.get("product") == "Personal Loan", f"Product not updated: {updated_loan.get('product')}"
        
        print(f"✓ Updated loan category to 'UNSECURED' and product to 'Personal Loan'")
        
        # Verify by GET
        get_response = self.session.get(f"{BASE_URL}/api/loans/{loan_id}")
        assert get_response.status_code == 200
        fetched_loan = get_response.json()
        assert fetched_loan.get("category") == "UNSECURED"
        assert fetched_loan.get("product") == "Personal Loan"
        print(f"✓ Verified update persisted correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
    
    def test_update_loan_clear_category_product(self):
        """PUT /api/loans/{id} can clear category and product to empty"""
        # First create a loan with category/product
        loan_data = {
            "agent_name": "TEST_Agent",
            "customer_name": "TEST_ClearCatProd_Customer",
            "company_name": "TEST_Company",
            "contact_no": "9876543213",
            "status": "Login Done",
            "bank": "SBI",
            "category": "SECURED",
            "product": "Home Loan",
            "month": "04-04-2026"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert create_response.status_code == 200
        loan_id = create_response.json()["id"]
        
        # Clear category and product
        update_data = {
            "category": "",
            "product": ""
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated_loan = update_response.json()
        assert updated_loan.get("category") == "", "Category should be cleared"
        assert updated_loan.get("product") == "", "Product should be cleared"
        
        print(f"✓ Cleared category and product successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
    
    # --- Loans List includes Category/Product ---
    def test_loans_list_includes_category_product_fields(self):
        """GET /api/loans should include category and product in response"""
        response = self.session.get(f"{BASE_URL}/api/loans?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        loans = data.get("loans", data) if isinstance(data, dict) else data
        
        if len(loans) > 0:
            first_loan = loans[0]
            # Check that category and product fields exist (even if empty)
            assert "category" in first_loan or first_loan.get("category") is not None or "category" in str(first_loan), \
                f"Loan should have 'category' field. Keys: {first_loan.keys()}"
            assert "product" in first_loan or first_loan.get("product") is not None or "product" in str(first_loan), \
                f"Loan should have 'product' field. Keys: {first_loan.keys()}"
            print(f"✓ Loans list includes category and product fields")
        else:
            print("⚠ No loans found to verify fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
