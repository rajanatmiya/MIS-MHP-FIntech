from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.append(["Customer Name", "Status", "Bank", "Category", "Product"])
ws.append(["TESTUI_User A", "Pending", "SBI", "SECURED", "Home Loan"])
ws.append(["TESTUI_User B", "Approved", "ICICI", "UNSECURED", "Personal Loan"])
wb.save("/tmp/ui_cat_prod.xlsx")
print("saved")
