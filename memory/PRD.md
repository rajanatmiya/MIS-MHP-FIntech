# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS (Management Information System) dashboard for a loan agency (MHP Fintech). The app manages loan applications, agents, schemes, statuses, and provides analytics — all with role-based access control (Admin, Manager, Agent).

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Auth:** JWT with RBAC (Admin/Manager/Agent)
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## What's Been Implemented
- Role-Based Access Control (Admin/Manager/Agent) — fully verified with team-based data segregation
- Manager role seeded (manager@mhpfintech.com) with TEAM-A, Agent assigned to Manager
- MIS Board with inline editing, filters, dynamic columns
- Scheme & Status management (Admin CRUD)
- User management with activate/deactivate, manager assignment dropdown
- Dashboard analytics with creative design (rate rings, stat tiles, status bars, bank table)
- Excel export with readable column headers and auto-fit widths
- Excel import with duplicate detection (customer_name + contact_no + bank)
- LoanForm date picker (dd-mm-yyyy format)
- Month normalization tools
- Decline reason field
- PWA: manifest, service worker, install prompt, offline page
- Delete loan (admin-only)
- Paginated /api/loans endpoint with DB indexing

## Recent Changes
- Seeded Manager user (manager@mhpfintech.com / Admin@123, TEAM-A)
- Agent (agent@mhpfintech.com) assigned to Manager with manager_id
- Fixed Agent empty id bug in seed logic
- Import duplicate detection: skips rows matching customer_name + contact_no + bank
- Import returns {imported, skipped, duplicates, total_rows, errors}
- Export: readable headers (Date, Customer Name, etc.), auto-fit column widths, auth via axios
- LoanForm: Month field changed to native date picker, stores as dd-mm-yyyy

## RBAC Verification — COMPLETE
- Admin: Full access to all data, delete, user management, export/import
- Manager: Sees own + assigned agents' loans and analytics
- Agent: Sees only own data, no delete, no user management, no export/import

## Pending / Backlog
- **P2:** Refactor `backend/server.py` into modular routers (routes/auth.py, routes/loans.py, etc.)
- **P2:** Refactor `MonthlyMIS.jsx` into smaller reusable components

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, assigned to Manager)
