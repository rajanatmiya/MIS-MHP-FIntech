# MHP Fintech MIS Dashboard - PRD

## Problem Statement
A comprehensive MIS (Management Information System) dashboard for a loan agency (MHP Fintech). The app manages loan applications, agents, schemes, statuses, and provides analytics — all with role-based access control (Admin, Manager, Agent).

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with RBAC
- **PWA:** Service Worker, Web App Manifest

## What's Been Implemented
- Role-Based Access Control (Admin/Manager/Agent)
- MIS Board with inline editing, filters, dynamic columns
- Scheme & Status management (Admin CRUD)
- User management with activate/deactivate
- Organization schedule management
- Dashboard analytics (totals, bank-wise, conversion rates)
- Excel export (admin-only)
- Month normalization tools
- Decline reason field
- Unified Add Entry form
- PWA: manifest, service worker, install prompt, offline page

## PWA Implementation (Feb 2026)
- Updated `manifest.json` with 4 proper PNG icons (192x192 & 512x512, any + maskable)
- Rewrote `service-worker.js` with smart caching strategies (network-first for API, stale-while-revalidate for assets)
- Added `offline.html` fallback page
- Service worker registration in App.js
- Install prompt component in App.js

## Pending / In Progress
- **P0:** Full RBAC verification (Manager user not yet created)
- **P1:** Fix delete loan functionality, status dropdown, modal overlay issues
- **P2:** Backend pagination, database indexing

## Backlog
- Refactor `backend/server.py` into modular routers
- Refactor `MonthlyMIS.jsx` into smaller components

## Credentials
- Admin: admin@mhpfintech.com / Admin@123
- Agent: agent@mhpfintech.com / Admin@123
