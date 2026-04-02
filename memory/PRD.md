# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS (Management Information System) dashboard for a loan agency (MHP Fintech). The app manages loan applications, agents, schemes, statuses, and provides analytics — all with role-based access control (Admin, Manager, Agent).

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Auth:** JWT with RBAC (Admin/Manager/Agent)
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## What's Been Implemented
- Role-Based Access Control (Admin/Manager/Agent) — fully verified
- MIS Board with inline editing, filters, dynamic columns
- Scheme & Status management (Admin CRUD)
- User management with activate/deactivate
- Organization schedule management
- Dashboard analytics with creative design (rate rings, stat tiles, status bars, bank table)
- Excel export (admin-only)
- Month normalization tools
- Decline reason field
- Unified Add Entry form
- PWA: manifest, service worker, install prompt, offline page
- Delete loan (admin-only) — verified working
- Paginated /api/loans endpoint with DB indexing

## UI Redesign (Feb 2026) — COMPLETE
- All pages redesigned with compact `text-xs` / `text-[10px]` fonts
- Sidebar: `#2c587a` brand color, white text, `bg-white/20` active state
- Dashboard Overview: Personalized greeting, 6-column MiniStat tiles, SVG RateRing charts, HBar status breakdown, bank-wise analysis table
- MonthlyMIS, Loans, Analytics, Schemes, Users, Statuses, FieldConfig, Settings — all redesigned
- Mobile responsive with collapsible menu

## RBAC Verification — COMPLETE
- Admin: Full access to all data, delete, user management
- Agent: Sees only own data, no delete button, no user management access
- Analytics/overview endpoint RBAC re-enabled

## Recent Changes
- LoanForm: Month field changed from text input to native date picker, stores as `dd-mm-yyyy`

## Pending / Backlog
- **P2:** Refactor `backend/server.py` into modular routers (routes/auth.py, routes/loans.py, etc.)
- **P2:** Refactor `MonthlyMIS.jsx` into smaller reusable components
- **LOW:** Agent user has empty 'id' field in login response (cosmetic, login still works)

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Agent: agent@mhpfintech.com / Admin@123
