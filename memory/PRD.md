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
- **Manager**: Dashboard + MIS + Loans + Analytics + Onboarding. Sees only their team's data.
- **Admin**: Full access to all pages and all data.

## What's Been Implemented
- Strict page access with RoleGuard
- Bank/Category/Product-level filtering on ALL data endpoints
- Manager sees only assigned agents' data
- Master File page — 7 sections: Banks (97), Agents, Companies, Branches, Locations, Categories (6), Products (6)
- DB Backup page
- Form dropdowns from master data (Bank, Agent, Company, Branch, Location, Category, Product)
- MIS Board with inline editing, Edit/Delete, Category/Product columns, quick filters
- Excel export/import with duplicate detection
- LoanForm with Category and Product dropdown selects
- User Management: Assigned Banks, Categories, Products + 2-column responsive form
- **Agent Onboarding Wizard** — 5-step guided flow: Basic Info > Team > Banks > Category/Product > Review (DONE)
- **Team Performance Leaderboard** — Dashboard section with agent rankings by disbursement, medal icons, conversion rates (DONE)
- PWA support

## Pending / Backlog
- **P2:** Bulk delete / bulk status update feature in MIS table
- **P2:** Refactor `backend/server.py` into modular routers
- **P2:** Refactor `MonthlyMIS.jsx` into smaller components
- **P2:** Bulk import master data directly from Excel

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, banks: SBI/HDFC Bank, categories: SECURED/UNSECURED, products: Home Loan/LAP)
