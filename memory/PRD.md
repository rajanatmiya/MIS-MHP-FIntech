# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS dashboard for a loan agency (MHP Fintech). Manages loan applications, agents, schemes, statuses, and analytics with strict role-based access control.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with RBAC (Admin/Manager/Agent) + Bank/Category/Product-level access control
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## Role-Based Access (Verified)
- **Agent**: MIS + Loans only. Sees only loans matching assigned banks, categories, and products.
- **Manager**: Dashboard + MIS + Loans + Analytics. Sees only their team's data, filtered by assigned banks/categories/products.
- **Admin**: Full access to all pages and all data.

## What's Been Implemented
- Strict page access with RoleGuard (redirects unauthorized routes)
- Bank/Category/Product-level filtering on ALL data endpoints
- Manager sees only assigned agents' data across all pages
- Master File page — 7 sections: Banks (97), Agents, Companies, Branches, Locations, Categories (6), Products (6)
- DB Backup page — JSON backup download
- Form dropdowns from master data (Bank, Agent, Company, Branch, Location, Category, Product)
- MIS Board with inline editing, Edit/Delete actions, Category/Product columns
- MIS Board quick filters: Category, Product, Bank (top-level)
- Excel export/import with duplicate detection
- LoanForm with Category and Product dropdown selects
- User Management: Assigned Banks, Assigned Categories, Assigned Products as scrollable checkbox lists
- Data visibility enforced: users only see loans matching their assigned banks + categories + products
- PWA support

## Pending / Backlog
- **P1:** Agent onboarding wizard with bank assignment flow
- **P1:** Team performance leaderboard for Managers (Dashboard enhancement)
- **P2:** Bulk delete / bulk status update feature in MIS table
- **P2:** Refactor `backend/server.py` into modular routers
- **P2:** Refactor `MonthlyMIS.jsx` into smaller components
- **P2:** Bulk import master data directly from Excel

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, banks: SBI/HDFC Bank, categories: SECURED/UNSECURED, products: Home Loan/LAP)
