# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS dashboard for a loan agency (MHP Fintech). Manages loan applications, agents, schemes, statuses, and analytics with strict role-based access control.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with RBAC (Admin/Manager/Agent) + Bank-level access control
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## Role-Based Access (Verified)
- **Agent**: MIS + Loans only. Sees only loans from assigned banks. No Dashboard, Analytics, Settings.
- **Manager**: Dashboard + MIS + Loans + Analytics. Sees only their team's (assigned agents') data.
- **Admin**: Full access to all pages and all data.

## What's Been Implemented
- Strict page access with RoleGuard (redirects unauthorized routes)
- Bank-level filtering on ALL data endpoints (loans, analytics/overview, by-bank, by-agent, by-month, unique-values)
- Manager sees only assigned agents' data across all pages
- Master File page — 7 categories: Banks, Agents, Companies, Branches, Locations, Categories, Products
- DB Backup page — JSON backup download with 11 collection stats
- Form dropdowns from master data (Bank, Agent, Company, Branch, Location, Category, Product)
- MIS Board with inline editing, Edit/Delete actions
- MIS Board quick filters: Category, Product, Bank (top-level)
- MIS Board table includes Category and Product columns with inline dropdown editing
- Excel export/import with duplicate detection
- LoanForm date picker (dd-mm-yyyy)
- LoanForm Category and Product dropdown selects
- Category & Product fields in loan creation (Add Entry) and editing (Edit Entry) dialogs
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
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, assigned banks: SBI, HDFC Bank)
