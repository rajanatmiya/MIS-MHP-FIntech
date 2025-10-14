import requests
import sys
import json
from datetime import datetime

class MISBackendTester:
    def __init__(self, base_url="https://agentportal-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def test_auth_register(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        test_data = {
            "name": "Test User",
            "email": test_email,
            "password": "TestPass123!",
            "role": "agent"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
                self.log_test("User Registration", True, f"User created with ID: {self.user_id}")
            else:
                self.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
            
            return success
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
            return False

    def test_auth_login(self):
        """Test user login with existing user"""
        # First create a user for login test
        test_email = f"login_test_{datetime.now().strftime('%H%M%S')}@example.com"
        register_data = {
            "name": "Login Test User",
            "email": test_email,
            "password": "LoginTest123!",
            "role": "agent"
        }
        
        try:
            # Register user first
            requests.post(f"{self.api_url}/auth/register", json=register_data)
            
            # Now test login
            login_data = {
                "email": test_email,
                "password": "LoginTest123!"
            }
            
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                login_token = data.get('access_token')
                self.log_test("User Login", True, f"Login successful, token received")
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
            
            return success
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False

    def test_auth_me(self):
        """Test get current user"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            
            if success:
                user_data = response.json()
                self.log_test("Get Current User", True, f"User data retrieved: {user_data.get('name')}")
            else:
                self.log_test("Get Current User", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")
            return False

    def test_create_loan(self):
        """Test creating a loan application"""
        if not self.token:
            self.log_test("Create Loan", False, "No token available")
            return False, None
        
        loan_data = {
            "agent_name": "Test Agent",
            "customer_name": "John Doe",
            "company_name": "ABC Corp",
            "contact_no": "9876543210",
            "status": "Login Done",
            "bank": "HDFC Bank",
            "sanction": "500000",
            "disbursed": "",
            "remark": "Test loan application",
            "scheme": "Salaried PL",
            "case_type": "In House",
            "from_location": "Mumbai",
            "branch": "Andheri",
            "executive_name": "Test Executive",
            "team_manager_code": "TM001",
            "month": "Jan'25"
        }
        
        try:
            headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            response = requests.post(f"{self.api_url}/loans", json=loan_data, headers=headers)
            success = response.status_code == 200
            
            loan_id = None
            if success:
                data = response.json()
                loan_id = data.get('id')
                self.log_test("Create Loan", True, f"Loan created with ID: {loan_id}")
            else:
                self.log_test("Create Loan", False, f"Status: {response.status_code}, Response: {response.text}")
            
            return success, loan_id
        except Exception as e:
            self.log_test("Create Loan", False, f"Exception: {str(e)}")
            return False, None

    def test_get_loans(self):
        """Test getting loan applications"""
        if not self.token:
            self.log_test("Get Loans", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/loans", headers=headers)
            success = response.status_code == 200
            
            if success:
                loans = response.json()
                self.log_test("Get Loans", True, f"Retrieved {len(loans)} loans")
            else:
                self.log_test("Get Loans", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Get Loans", False, f"Exception: {str(e)}")
            return False

    def test_get_loan_by_id(self, loan_id):
        """Test getting a specific loan by ID"""
        if not self.token or not loan_id:
            self.log_test("Get Loan by ID", False, "No token or loan ID available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/loans/{loan_id}", headers=headers)
            success = response.status_code == 200
            
            if success:
                loan = response.json()
                self.log_test("Get Loan by ID", True, f"Retrieved loan: {loan.get('customer_name')}")
            else:
                self.log_test("Get Loan by ID", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Get Loan by ID", False, f"Exception: {str(e)}")
            return False

    def test_update_loan(self, loan_id):
        """Test updating a loan application"""
        if not self.token or not loan_id:
            self.log_test("Update Loan", False, "No token or loan ID available")
            return False
        
        update_data = {
            "status": "Disbursed",
            "disbursed": "450000",
            "remark": "Updated loan - disbursed successfully"
        }
        
        try:
            headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            response = requests.put(f"{self.api_url}/loans/{loan_id}", json=update_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                updated_loan = response.json()
                self.log_test("Update Loan", True, f"Loan updated, status: {updated_loan.get('status')}")
            else:
                self.log_test("Update Loan", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Update Loan", False, f"Exception: {str(e)}")
            return False

    def test_delete_loan(self, loan_id):
        """Test deleting a loan application"""
        if not self.token or not loan_id:
            self.log_test("Delete Loan", False, "No token or loan ID available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.delete(f"{self.api_url}/loans/{loan_id}", headers=headers)
            success = response.status_code == 200
            
            if success:
                self.log_test("Delete Loan", True, "Loan deleted successfully")
            else:
                self.log_test("Delete Loan", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Delete Loan", False, f"Exception: {str(e)}")
            return False

    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        if not self.token:
            self.log_test("Analytics Overview", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/analytics/overview", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test("Analytics Overview", True, f"Total: {data.get('total')}, Disbursed: {data.get('disbursed')}")
            else:
                self.log_test("Analytics Overview", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Analytics Overview", False, f"Exception: {str(e)}")
            return False

    def test_analytics_by_bank(self):
        """Test bank-wise analytics endpoint"""
        if not self.token:
            self.log_test("Analytics by Bank", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/analytics/by-bank", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test("Analytics by Bank", True, f"Bank stats retrieved: {len(data)} banks")
            else:
                self.log_test("Analytics by Bank", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Analytics by Bank", False, f"Exception: {str(e)}")
            return False

    def test_analytics_by_agent(self):
        """Test agent-wise analytics endpoint"""
        if not self.token:
            self.log_test("Analytics by Agent", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/analytics/by-agent", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test("Analytics by Agent", True, f"Agent stats retrieved: {len(data)} agents")
            else:
                self.log_test("Analytics by Agent", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Analytics by Agent", False, f"Exception: {str(e)}")
            return False

    def test_analytics_by_month(self):
        """Test month-wise analytics endpoint"""
        if not self.token:
            self.log_test("Analytics by Month", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/analytics/by-month", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test("Analytics by Month", True, f"Month stats retrieved: {len(data)} months")
            else:
                self.log_test("Analytics by Month", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Analytics by Month", False, f"Exception: {str(e)}")
            return False

    def test_unique_values(self):
        """Test unique values endpoint"""
        if not self.token:
            self.log_test("Get Unique Values", False, "No token available")
            return False
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/analytics/unique-values", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                banks_count = len(data.get('banks', []))
                statuses_count = len(data.get('statuses', []))
                self.log_test("Get Unique Values", True, f"Banks: {banks_count}, Statuses: {statuses_count}")
            else:
                self.log_test("Get Unique Values", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Get Unique Values", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting MIS Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Authentication tests
        print("\n📝 Authentication Tests:")
        if not self.test_auth_register():
            print("❌ Registration failed - stopping tests")
            return False
        
        self.test_auth_login()
        self.test_auth_me()
        
        # Loan CRUD tests
        print("\n📋 Loan Management Tests:")
        loan_created, loan_id = self.test_create_loan()
        self.test_get_loans()
        
        if loan_id:
            self.test_get_loan_by_id(loan_id)
            self.test_update_loan(loan_id)
            # Don't delete the loan yet, keep it for analytics tests
        
        # Analytics tests
        print("\n📊 Analytics Tests:")
        self.test_analytics_overview()
        self.test_analytics_by_bank()
        self.test_analytics_by_agent()
        self.test_analytics_by_month()
        self.test_unique_values()
        
        # Clean up - delete the test loan
        if loan_id:
            self.test_delete_loan(loan_id)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary:")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = MISBackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': tester.tests_run - tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0
            },
            'test_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())