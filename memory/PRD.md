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
- **Status Management Enhancement — Apr 2026:** Enhanced status deletion with replacement flow. When deleting a status used by loans, shows count + dropdown to pick replacement. Backend: POST /api/statuses/rename-in-loans bulk-renames status in all loans. GET /api/statuses/usage-count shows loan counts per status.
- **Analytics Deep Upgrade — Apr 2026:** Fixed month-wise charts to show "Apr-2026" instead of raw dates. Added deep analytics: Summary KPIs, Status donut chart, Category-wise bars, Product-wise bars, Agent disbursement amounts, Month-wise amount trends (Sanctioned vs Disbursed). New endpoint: GET /api/analytics/deep.
- **Frozen Columns & Footer Totals — Aug 2026:** Month MIS table freezes 7 columns (Date through Status) via CSS `position:sticky` with `table-layout:fixed`. Footer totals row shows Amount, Sanction Amount, and Disbursed Amount totals with opaque backgrounds.
- **Master Customer/Executive/Manager — Aug 2026:** Added 3 new Master File sections: Customer Names (with contact number), Executive Names, Team Managers. Used as dropdown selects in MIS Board add/edit forms. Customer selection auto-fills contact number. Edit form preserves legacy values with "(current)" indicator. Inline "+" buttons on MIS forms allow adding new entries without leaving the page.
- **Bank Name Standardization — Aug 2026:** Auto-run startup migration renames 9 bank names (kotak→Kotak Bank, db→Deutsche, fullerton→SMFG, etc.) in both master_banks and loan records. Idempotent — safe to run multiple times. Also added `POST /api/master/banks/rename-bulk` endpoint for custom renames.
- **Bulk Excel Import — Aug 2026:** Master File page has "Import Excel" button. Upload .xlsx to bulk import into any master section (Banks, Agents, Companies, Customers, Executives, Managers, etc.). Auto-detects "Name" and "Contact No" columns. Skips duplicates. Backend: `POST /api/master/import-excel`.
- **Master Rename Propagation — Aug 2026:** Renaming a master record (Customer, Company, Executive, Manager, Bank, Agent) propagates the change into all existing loan records. Uses trimmed, regex-escaped exact matching to handle whitespace from Excel imports.
- **Role-Based Form Rules — Aug 2026:** Admin: Customer Name, Contact No, Company Name optional. Manager/Agent: mandatory with `*` labels and toast validation. Excel import has no mandatory columns.
- **Import Data Normalization — Aug 2026:** Excel import handles NaN→empty string, NaT dates, numeric `.0` suffix removal, Category/Product column mapping with expanded aliases.
- **Import Month Selector — Aug 2026:** Month MIS import dialog lets user select target month group before upload; backend assigns `group_month` from selection.
- **Date Sorting Within Month Groups — Feb 2026:** Loans within each MIS month group are now sorted by date (newest first) on both the frontend table and Excel export. Previously sorted by creation time which caused random date order.
- **Month Export Group Filter Fix — Feb 2026:** Fixed month export to use `group_month` as authoritative primary filter instead of regex date matching. Prevents cross-month leakage (e.g., July-dated records assigned to Aug-2026 no longer appear in Jul export). Legacy fallback for records without `group_month`. Testing: iteration 40, 4/4 passed.
- **RBAC Agent Isolation Fix — Aug 2026:** Agents only see loans where `created_by` matches their user ID. Managers see own + team data.
- **Master Data Permissions — Aug 2026:** Manager/Agent can POST new master entries (Customer, Company, Executive, Manager). PUT/DELETE remain Admin-only.
- **Duplicate Customers Allowed — Aug 2026:** Master File Customer Names allow duplicate entries by design.
- **Loan-to-Master Auto-Sync — Aug 2026:** Creating/updating a loan auto-syncs Customer, Company, Executive, Manager, Bank values to their respective master collections.

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
- **P2:** Refactor `backend/server.py` into modular routers (~3,500 lines)
- **P2:** Refactor `MonthlyMIS.jsx` into smaller components (~2,000+ lines)

## Important Design Decisions
- Month export uses `group_month` as authoritative filter (not date regex)
- Agent visibility: strict `created_by` match only (not `agent_name`)
- Startup migrations must be idempotent (no `delete_many({})`)
- Executive/Manager master lists use authoritative Excel seed (no loan sync)
- Table cells are read-only; users edit via row Edit action
- Frozen columns end at Status column

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Manager: jyoti.tripathi@mhpfintech.com / Jyoti@MHP
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, banks: SBI/HDFC Bank)
- Agent: dhruvi.shah@mhpfintech.com / Dhruvi@MHP (under Jyoti, banks: HERO/YES)
