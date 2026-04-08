import requests
import sys
import json
from datetime import datetime
import io

class MonthlyMISBackendTester:
    def __init__(self, base_url="https://agent-mis-portal.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.agent_token = None
        self.manager_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_loan_ids = []

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

    def login_admin(self):
        """Login as admin user"""
        login_data = {
            "email": "admin@mhpfintech.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.admin_token = data.get('access_token')
                self.log_test("Admin Login", True, "Admin login successful")
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
            
            return success
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def create_test_user(self, role="agent", email_suffix=""):
        """Create a test user for RBAC testing"""
        test_email = f"test_{role}_{email_suffix}_{datetime.now().strftime('%H%M%S')}@example.com"
        user_data = {
            "name": f"Test {role.title()}",
            "email": test_email,
            "password": "TestPass123!",
            "role": role
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=user_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                token = data.get('access_token')
                user_id = data.get('user', {}).get('id')
                self.log_test(f"Create {role.title()} User", True, f"User created with ID: {user_id}")
                return token, user_id
            else:
                self.log_test(f"Create {role.title()} User", False, f"Status: {response.status_code}")
                return None, None
        except Exception as e:
            self.log_test(f"Create {role.title()} User", False, f"Exception: {str(e)}")
            return None, None

    def create_sample_loans(self):
        """Create sample loan data for different months and statuses"""
        if not self.admin_token:
            self.log_test("Create Sample Loans", False, "No admin token available")
            return False

        # Sample loan data for different months and statuses
        sample_loans = [
            # Jan'23 loans
            {
                "agent_name": "Rajesh Kumar", "customer_name": "Amit Sharma", "company_name": "Tech Solutions Pvt Ltd",
                "contact_no": "9876543210", "status": "Disbursed", "bank": "HDFC Bank", "sanction": "500000",
                "disbursed": "450000", "month": "Jan'23", "scheme": "Business Loan", "case_type": "In House"
            },
            {
                "agent_name": "Priya Singh", "customer_name": "Neha Gupta", "company_name": "Fashion Hub",
                "contact_no": "9876543211", "status": "Decline", "bank": "ICICI Bank", "sanction": "300000",
                "month": "Jan'23", "scheme": "Personal Loan", "case_type": "DSA"
            },
            {
                "agent_name": "Vikram Patel", "customer_name": "Rohit Verma", "company_name": "Digital Marketing Co",
                "contact_no": "9876543212", "status": "Login Done", "bank": "SBI", "sanction": "750000",
                "month": "Jan'23", "scheme": "Working Capital", "case_type": "In House"
            },
            
            # Feb'23 loans
            {
                "agent_name": "Sunita Rao", "customer_name": "Kavita Joshi", "company_name": "Retail Store",
                "contact_no": "9876543213", "status": "Disbursed", "bank": "Axis Bank", "sanction": "400000",
                "disbursed": "380000", "month": "Feb'23", "scheme": "Business Loan", "case_type": "DSA"
            },
            {
                "agent_name": "Manoj Agarwal", "customer_name": "Suresh Reddy", "company_name": "Construction Ltd",
                "contact_no": "9876543214", "status": "Hold", "bank": "HDFC Bank", "sanction": "1000000",
                "month": "Feb'23", "scheme": "Project Loan", "case_type": "In House"
            },
            {
                "agent_name": "Anjali Mehta", "customer_name": "Deepak Singh", "company_name": "Export House",
                "contact_no": "9876543215", "status": "Pd To Be Done", "bank": "ICICI Bank", "sanction": "600000",
                "month": "Feb'23", "scheme": "Export Finance", "case_type": "DSA"
            },
            
            # Mar'23 loans
            {
                "agent_name": "Ravi Sharma", "customer_name": "Pooja Agarwal", "company_name": "Software Services",
                "contact_no": "9876543216", "status": "Disbursed", "bank": "SBI", "sanction": "800000",
                "disbursed": "750000", "month": "Mar'23", "scheme": "Term Loan", "case_type": "In House"
            },
            {
                "agent_name": "Geeta Kumari", "customer_name": "Arjun Patel", "company_name": "Manufacturing Unit",
                "contact_no": "9876543217", "status": "Decline", "bank": "Axis Bank", "sanction": "1200000",
                "month": "Mar'23", "scheme": "Machinery Loan", "case_type": "DSA"
            }
        ]

        headers = {'Authorization': f'Bearer {self.admin_token}', 'Content-Type': 'application/json'}
        created_count = 0
        
        for loan_data in sample_loans:
            try:
                response = requests.post(f"{self.api_url}/loans", json=loan_data, headers=headers)
                if response.status_code == 200:
                    loan_id = response.json().get('id')
                    self.created_loan_ids.append(loan_id)
                    created_count += 1
                else:
                    print(f"Failed to create loan for {loan_data['customer_name']}: {response.status_code}")
            except Exception as e:
                print(f"Exception creating loan for {loan_data['customer_name']}: {str(e)}")

        success = created_count > 0
        self.log_test("Create Sample Loans", success, f"Created {created_count} out of {len(sample_loans)} sample loans")
        return success

    def test_monthly_trends_endpoint(self):
        """Test /api/analytics/monthly-trends endpoint"""
        if not self.admin_token:
            self.log_test("Monthly Trends API", False, "No admin token available")
            return False

        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(f"{self.api_url}/analytics/monthly-trends", headers=headers)
            success = response.status_code == 200

            if success:
                data = response.json()
                
                # Verify data structure
                if isinstance(data, list) and len(data) > 0:
                    first_month = data[0]
                    required_fields = ['month', 'total', 'disbursed', 'declined', 'pending', 'login_done']
                    has_all_fields = all(field in first_month for field in required_fields)
                    
                    if has_all_fields:
                        # Check if data is sorted by month
                        months = [item['month'] for item in data]
                        is_sorted = months == sorted(months)
                        
                        details = f"Retrieved {len(data)} months of data. Fields: {list(first_month.keys())}. Sorted: {is_sorted}"
                        self.log_test("Monthly Trends API", True, details)
                        
                        # Print sample data for verification
                        print(f"    Sample data: {json.dumps(data[:2], indent=2)}")
                    else:
                        missing_fields = [f for f in required_fields if f not in first_month]
                        self.log_test("Monthly Trends API", False, f"Missing fields: {missing_fields}")
                        success = False
                else:
                    self.log_test("Monthly Trends API", False, f"Invalid data format or empty: {type(data)}")
                    success = False
            else:
                self.log_test("Monthly Trends API", False, f"Status: {response.status_code}, Response: {response.text}")

            return success
        except Exception as e:
            self.log_test("Monthly Trends API", False, f"Exception: {str(e)}")
            return False

    def test_excel_export_endpoint(self):
        """Test /api/export/loans endpoint with month parameter"""
        if not self.admin_token:
            self.log_test("Excel Export API", False, "No admin token available")
            return False

        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            # Test export for Jan'23
            response = requests.get(f"{self.api_url}/export/loans?month=Jan'23", headers=headers)
            success = response.status_code == 200

            if success:
                # Check if response is an Excel file
                content_type = response.headers.get('content-type', '')
                is_excel = 'spreadsheet' in content_type or 'excel' in content_type
                
                # Check content disposition header
                content_disposition = response.headers.get('content-disposition', '')
                has_filename = 'filename=' in content_disposition
                
                # Check if content is not empty
                content_length = len(response.content)
                
                details = f"Excel file generated. Content-Type: {content_type}, Size: {content_length} bytes, Has filename: {has_filename}"
                
                if is_excel and content_length > 0:
                    self.log_test("Excel Export API", True, details)
                else:
                    self.log_test("Excel Export API", False, f"Invalid Excel response. {details}")
                    success = False
            else:
                self.log_test("Excel Export API", False, f"Status: {response.status_code}, Response: {response.text}")

            return success
        except Exception as e:
            self.log_test("Excel Export API", False, f"Exception: {str(e)}")
            return False

    def test_excel_export_all_months(self):
        """Test Excel export for different months"""
        if not self.admin_token:
            self.log_test("Excel Export All Months", False, "No admin token available")
            return False

        months_to_test = ["Jan'23", "Feb'23", "Mar'23"]
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        successful_exports = 0

        for month in months_to_test:
            try:
                response = requests.get(f"{self.api_url}/export/loans?month={month}", headers=headers)
                if response.status_code == 200 and len(response.content) > 0:
                    successful_exports += 1
                    print(f"    ✅ {month}: {len(response.content)} bytes")
                else:
                    print(f"    ❌ {month}: Status {response.status_code}")
            except Exception as e:
                print(f"    ❌ {month}: Exception {str(e)}")

        success = successful_exports == len(months_to_test)
        self.log_test("Excel Export All Months", success, f"Successfully exported {successful_exports}/{len(months_to_test)} months")
        return success

    def test_rbac_filtering(self):
        """Test RBAC filtering for different user roles"""
        # Create a manager and agent user
        manager_token, manager_id = self.create_test_user("manager", "rbac")
        agent_token, agent_id = self.create_test_user("agent", "rbac")

        if not manager_token or not agent_token:
            self.log_test("RBAC Filtering", False, "Failed to create test users")
            return False

        # Test admin access (should see all loans)
        try:
            admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
            admin_response = requests.get(f"{self.api_url}/analytics/monthly-trends", headers=admin_headers)
            admin_data = admin_response.json() if admin_response.status_code == 200 else []

            # Test manager access (should see only their team's loans - initially empty)
            manager_headers = {'Authorization': f'Bearer {manager_token}'}
            manager_response = requests.get(f"{self.api_url}/analytics/monthly-trends", headers=manager_headers)
            manager_data = manager_response.json() if manager_response.status_code == 200 else []

            # Test agent access (should see only their own loans - initially empty)
            agent_headers = {'Authorization': f'Bearer {agent_token}'}
            agent_response = requests.get(f"{self.api_url}/analytics/monthly-trends", headers=agent_headers)
            agent_data = agent_response.json() if agent_response.status_code == 200 else []

            # Admin should see more data than manager/agent
            admin_total = sum(month.get('total', 0) for month in admin_data)
            manager_total = sum(month.get('total', 0) for month in manager_data)
            agent_total = sum(month.get('total', 0) for month in agent_data)

            success = admin_total >= manager_total >= agent_total
            details = f"Admin sees {admin_total} loans, Manager sees {manager_total} loans, Agent sees {agent_total} loans"
            self.log_test("RBAC Filtering", success, details)
            return success

        except Exception as e:
            self.log_test("RBAC Filtering", False, f"Exception: {str(e)}")
            return False

    def test_edge_cases(self):
        """Test edge cases"""
        if not self.admin_token:
            self.log_test("Edge Cases", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        edge_cases_passed = 0
        total_edge_cases = 3

        # Test 1: Export with non-existent month
        try:
            response = requests.get(f"{self.api_url}/export/loans?month=NonExistent'99", headers=headers)
            if response.status_code == 200:
                # Should return empty Excel file
                edge_cases_passed += 1
                print("    ✅ Non-existent month handled correctly")
            else:
                print(f"    ❌ Non-existent month: Status {response.status_code}")
        except Exception as e:
            print(f"    ❌ Non-existent month: Exception {str(e)}")

        # Test 2: Export with special characters in month
        try:
            response = requests.get(f"{self.api_url}/export/loans?month=Test'@#$", headers=headers)
            if response.status_code == 200:
                edge_cases_passed += 1
                print("    ✅ Special characters in month handled correctly")
            else:
                print(f"    ❌ Special characters: Status {response.status_code}")
        except Exception as e:
            print(f"    ❌ Special characters: Exception {str(e)}")

        # Test 3: Monthly trends with no data (using agent token with no loans)
        agent_token, _ = self.create_test_user("agent", "edge")
        if agent_token:
            try:
                agent_headers = {'Authorization': f'Bearer {agent_token}'}
                response = requests.get(f"{self.api_url}/analytics/monthly-trends", headers=agent_headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        edge_cases_passed += 1
                        print(f"    ✅ Empty data handled correctly: {len(data)} months")
                    else:
                        print(f"    ❌ Empty data: Invalid format {type(data)}")
                else:
                    print(f"    ❌ Empty data: Status {response.status_code}")
            except Exception as e:
                print(f"    ❌ Empty data: Exception {str(e)}")

        success = edge_cases_passed == total_edge_cases
        self.log_test("Edge Cases", success, f"Passed {edge_cases_passed}/{total_edge_cases} edge case tests")
        return success

    def cleanup_test_data(self):
        """Clean up created test loans"""
        if not self.admin_token or not self.created_loan_ids:
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        deleted_count = 0

        for loan_id in self.created_loan_ids:
            try:
                response = requests.delete(f"{self.api_url}/loans/{loan_id}", headers=headers)
                if response.status_code == 200:
                    deleted_count += 1
            except Exception:
                pass

        print(f"🧹 Cleaned up {deleted_count}/{len(self.created_loan_ids)} test loans")

    def run_monthly_mis_tests(self):
        """Run all Month-wise MIS specific tests"""
        print("🚀 Starting Month-wise MIS Backend Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Step 1: Login as admin
        print("\n🔐 Authentication Setup:")
        if not self.login_admin():
            print("❌ Admin login failed - stopping tests")
            return False

        # Step 2: Create sample loan data
        print("\n📊 Test Data Setup:")
        if not self.create_sample_loans():
            print("❌ Failed to create sample loans - continuing with existing data")

        # Step 3: Test Monthly Trends API
        print("\n📈 Monthly Trends API Tests:")
        self.test_monthly_trends_endpoint()

        # Step 4: Test Excel Export
        print("\n📋 Excel Export Tests:")
        self.test_excel_export_endpoint()
        self.test_excel_export_all_months()

        # Step 5: Test RBAC
        print("\n🔒 RBAC Tests:")
        self.test_rbac_filtering()

        # Step 6: Test Edge Cases
        print("\n🧪 Edge Case Tests:")
        self.test_edge_cases()

        # Step 7: Cleanup
        print("\n🧹 Cleanup:")
        self.cleanup_test_data()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Month-wise MIS Test Summary:")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = MonthlyMISBackendTester()
    success = tester.run_monthly_mis_tests()
    
    # Save detailed results
    with open('/app/monthly_mis_test_results.json', 'w') as f:
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