# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS dashboard for a loan agency (MHP Fintech). Manages loan applications, agents, schemes, statuses, and analytics with role-based access control (Admin, Manager, Agent).

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with RBAC (Admin/Manager/Agent)
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## What's Been Implemented
- Role-Based Access Control (Admin/Manager/Agent) — fully verified
- Manager role seeded with TEAM-A, Agent assigned to Manager
- MIS Board with inline editing, filters, dynamic columns, Edit/Delete actions
- Scheme & Status management (Admin CRUD)
- User management with manager assignment
- Dashboard analytics (rate rings, stat tiles, status bars, bank table)
- **Master File page** — Bank Names and Agent Names CRUD, search, RBAC
- **DB Backup page** — Collection stats, full JSON backup download
- **Form dropdowns** — Bank and Agent fields use master data in MIS Form and Loan Form
- Excel export (readable headers, auto-fit widths) / import (duplicate detection)
- LoanForm date picker (dd-mm-yyyy format)
- PWA: manifest, service worker, install prompt, offline page
- Delete loan (admin-only) on both MIS and Loans pages
- Paginated /api/loans endpoint with DB indexing

## Key DB Collections
- `users`, `loan_applications`, `schemes`, `statuses`, `master_banks`, `master_agents`

## Pending / Backlog
- **P2:** Refactor `backend/server.py` into modular routers
- **P2:** Refactor `MonthlyMIS.jsx` into smaller reusable components

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, assigned to Manager)
