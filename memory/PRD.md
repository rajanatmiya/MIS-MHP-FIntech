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
- Bank/Category/Product-level filtering on ALL data endpoints (includes empty/null values for backward compat)
- Manager sees only assigned agents' data
- Master File page — 7 sections: Banks (97), Agents, Companies, Branches, Locations, Categories (6), Products (6)
- DB Backup page with JSON Import (Merge/Replace modes)
- Form dropdowns from master data (Bank, Agent, Company, Branch, Location, Category, Product)
- MIS Board with inline editing, Edit/Delete actions, Category/Product columns
- **Multi-checkbox filters** (Category, Product, Bank) — select multiple values with chip tags (DONE)
- **Bulk operations** — Row checkboxes, Select All, floating action bar with Update Status dropdown + Delete button (DONE)
- Excel export/import with duplicate detection
- User Management: Assigned Banks, Categories, Products + 2-column responsive form
- Team Performance Leaderboard on Dashboard with medals, conversion rates
- Monthly Target Tracking — Set disbursement targets per agent, progress bars
- PWA support
- **P0 Bug Fix (Apr 2026):** Fixed data visibility for agents/managers with assigned categories/products — loans with empty/null category/product are now included via `$in` with `+ ["", None]` across all 8 endpoints

## Pending / Backlog
- **P2:** Refactor `backend/server.py` into modular routers (~2300 lines)
- **P2:** Refactor `MonthlyMIS.jsx` into smaller components (~1350 lines)
- **P2:** Bulk import master data directly from Excel

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Manager: manager@mhpfintech.com / Admin@123 (TEAM-A)
- Agent: agent@mhpfintech.com / Admin@123 (TEAM-A, banks: SBI/HDFC Bank, categories: SECURED/UNSECURED, products: Home Loan/LAP)
