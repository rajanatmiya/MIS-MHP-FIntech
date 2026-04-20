# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS dashboard for a loan agency (MHP Fintech). Manages loan applications, agents, schemes, statuses, and analytics with strict role-based access control.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (Motor async)
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with RBAC (Admin/Manager/Agent) + Bank/Category/Product-level access control
- **PWA:** Service Worker, Web App Manifest, Offline fallback

## What's Been Implemented
- Strict page access with RoleGuard
- RBAC: Admin sees all, Manager sees own+team, Agent sees own loans only (via `created_by` filtering)
- Bank/Category/Product assignments are informational — NOT used to restrict loan visibility (prevents bank name mismatch issues like 'YES' vs 'YES BANK')
- Master File page — 7 sections: Banks (97), Agents, Companies, Branches, Locations, Categories (6), Products (6)
- DB Backup page with JSON Import (Merge/Replace modes) + Archived Month Backups (Restore/Delete)
- Form dropdowns from master data (Bank, Agent, Company, Branch, Location, Category, Product)
- MIS Board with inline editing, Edit/Delete actions, Category/Product columns
- **Multi-checkbox filters** (Category, Product, Bank) — select multiple values with chip tags
- **Bulk operations** — Row checkboxes, Select All, floating action bar with Update Status dropdown + Delete button
- Excel export/import with duplicate detection
- User Management: Assigned Banks, Categories, Products + 2-column responsive form
- Team Performance Leaderboard on Dashboard with medals, conversion rates
- Monthly Target Tracking — Set disbursement targets per agent, progress bars
- PWA support
- **P0 Bug Fix (Apr 2026):** `build_rbac_filter` helper — agents always see ALL own loans, managers see ALL team loans. No bank/cat/prod query restriction
- **Month-wise MIS Grouping** — Loans grouped by month with manual "Add Month" flow, auto carry-forward for non-Disbursed loans, Archive/Delete per month group
- **Toggle buttons** (Columns, Filters, Select, Advanced) on MIS UI
- **Entry Status (Open/Closed) — Apr 2026:** Each loan entry has an Open/Closed toggle. Closed entries are greyed out with strikethrough. Carry-forward excludes both Closed entries AND Disbursed status loans. PATCH /api/loans/{id}/entry-status endpoint.
- **Export with Proper Columns — Apr 2026:** All 3 export endpoints (MIS month export, MIS top export, DB Backup full-data) use consistent column headers (Date, Customer Name, Company Name, etc.). DB Backup page now has both Excel and JSON export buttons. Auto-fit column widths on all Excel exports.
- **Technical Value & Legal Status Fields — Apr 2026:** Added two new free-text columns (Technical Value, Legal Status) to loan model, MIS table, Add/Edit forms, all exports, and import mapping.
- **Dashboard UI Redesign — Apr 2026:** Rebuilt Dashboard layout using "Control Room Grid". Performance Rates + Leaderboard side-by-side (1:3). Status Breakdown + Bank Analysis side-by-side with max-h scrollable containers. Compact table rows, sticky headers, colored accent stat cards.

## Key API Endpoints
- `/api/loans` (GET, POST) — CRUD with RBAC
- `/api/loans/{id}` (GET, PUT, DELETE)
- `/api/loans/{id}/entry-status` (PATCH) — Toggle Open/Closed
- `/api/loans/carry-forward` (POST) — Copies non-Disbursed, non-Closed loans to new month
- `/api/loans/delete-month` (POST) — Archives month group to backup
- `/api/backup/archived-months` (GET/DELETE/RESTORE)

## Key DB Schema
- `loan_applications`: `group_month` (string, e.g. "May-2026"), `entry_status` (string, "Open" or "Closed", default "Open")
- `deleted_month_backups`: Archived month data

## Pending / Backlog
- **P2:** Bulk import master data directly from Excel
- **P2:** Refactor `backend/server.py` into modular routers (~2600 lines)
- **P2:** Refactor `MonthlyMIS.jsx` into smaller components (~1700 lines)

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Manager: jyoti.tripathi@mhpfintech.com / Jyoti@MHP
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, banks: SBI/HDFC Bank)
- Agent: dhruvi.shah@mhpfintech.com / Dhruvi@MHP (under Jyoti, banks: HERO/YES)
