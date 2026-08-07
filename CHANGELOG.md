# Changelog

Repository-wide build history, in order. Backend module-level detail (what was added, what bugs were caught, what was deliberately simplified and why) lives in [backend/CHANGELOG.md](backend/CHANGELOG.md) — this file covers cross-project milestones and links to that detail rather than duplicating it.

## Phase 17 — Performance

Backend: in-process 30s response caching for the two most-polled analytics reads (scope-keyed so no caller ever sees another's cached data), two new Attendance indexes for Phase 15's query patterns, a dependency-free `npm run perf:smoke` latency check, and a real bug fix — `/analytics/export/csv` had no row cap at all, unlike every other export in the codebase. 512 backend tests. Details: [backend/CHANGELOG.md#phase-17--performance](backend/CHANGELOG.md#phase-17--performance).

## Phase 16 — Security Hardening

Backend: account lockout after 5 failed logins (15-minute lock, tracked on the `User` document), `GET /audit-logs` (Super Admin only) exposing the audit trail attendance corrections already write to, and a documented `npm audit` review (one moderate, unreachable, upstream-only finding). Admin dashboard: fixed a login-error message that would have misled a locked-out user. 499 backend tests. Details: [backend/CHANGELOG.md#phase-16--security-hardening](backend/CHANGELOG.md#phase-16--security-hardening).

## Phase 15 — AI-Assisted Analytics

Backend: `GET /analytics/ai/late-risk`, `/absenteeism-trend`, `/anomalies` — real, explainable statistics (late-arrival rate + trend, least-squares forecast, leave-one-out z-scores, cosine similarity), explicitly not a trained ML model. Caught and fixed a genuine self-inclusive-z-score bug along the way (see backend changelog). 482 backend tests. Details: [backend/CHANGELOG.md#phase-15--ai-assisted-analytics](backend/CHANGELOG.md#phase-15--ai-assisted-analytics).

## Phase 14 — Reports & Analytics Dashboard

Backend: `GET /analytics/dashboard`, `/attendance-trend`, `/department-comparison`, `/export/csv` — real headcount/attendance/late/leave-rate aggregation over Employee/Attendance, team-scoped for Managers, org-wide (cross-department comparison, CSV export) for Super Admin/HR. No synthetic numbers anywhere. 458 backend tests. Details: [backend/CHANGELOG.md#phase-14--reports--analytics-dashboard](backend/CHANGELOG.md#phase-14--reports--analytics-dashboard).

## Phase 13 — Offline Mode (backend half)

Backend: `POST /attendance/sync` — idempotent, conflict-surfacing bulk apply for offline-queued check-in/check-out punches, sharing one implementation with the live check-in/check-out endpoints rather than duplicating the logic. 433 backend tests. **The mobile half (Hive queue, connectivity listener) is not built** — no Flutter SDK in this environment; the API it would call against is ready. Details: [backend/CHANGELOG.md#phase-13--offline-mode-backend-half](backend/CHANGELOG.md#phase-13--offline-mode-backend-half).

## Phase 12 — Notifications

Backend: in-app notification feed, HR broadcasts, device-token registration, real triggers wired into leave/payroll/shift/attendance events, honestly-placeholdered FCM push. 417 backend tests. Details: [backend/CHANGELOG.md#phase-12--notifications](backend/CHANGELOG.md#phase-12--notifications).

## Phase 11 — Payroll

Backend: salary CRUD, attendance-driven payslip computation, batch generation, PDF payslips. 385 backend tests. Details: [backend/CHANGELOG.md#phase-11--payroll](backend/CHANGELOG.md#phase-11--payroll).

## Phase 10 — Shift Management

Backend: shift definitions, assignment, real integration with attendance's late/overtime math. 329 backend tests. Details: [backend/CHANGELOG.md#phase-10--shift-management](backend/CHANGELOG.md#phase-10--shift-management).

## Phase 9 — Leave Management

Backend: apply/approve/reject, business-day-aware balance accounting, holiday calendar. 284 backend tests. Details: [backend/CHANGELOG.md#phase-9--leave-management](backend/CHANGELOG.md#phase-9--leave-management).

## Phase 8 — Face Recognition

Backend: registration + cosine-similarity verification wired into attendance. One labeled placeholder (photo→embedding, confirmed with the project owner before building — no ML runtime in this environment). 218 backend tests. Details: [backend/CHANGELOG.md#phase-8--face-recognition](backend/CHANGELOG.md#phase-8--face-recognition).

## Phase 7 — QR Attendance

Backend: signed, time-boxed QR codes for check-in. 180 backend tests. Details: [backend/CHANGELOG.md#phase-7--qr-attendance](backend/CHANGELOG.md#phase-7--qr-attendance).

## Phase 6 — GPS Attendance

Backend: geofenced check-in via indexed `$geoNear` queries. 155 backend tests. Details: [backend/CHANGELOG.md#phase-6--gps-attendance](backend/CHANGELOG.md#phase-6--gps-attendance).

## Phase 5 — Attendance

Backend: check-in/out, breaks, working-hours computation, reporting/export, correction workflow. 137 backend tests. Details: [backend/CHANGELOG.md#phase-5--attendance](backend/CHANGELOG.md#phase-5--attendance).

## Phase 4 — Employee Management

Backend: employee CRUD, profile/document upload to Cloudinary. 98 backend tests. Details: [backend/CHANGELOG.md#phase-4--employee-management](backend/CHANGELOG.md#phase-4--employee-management).

## Phase 3 — Authentication

Backend: JWT auth, rotating refresh tokens, RBAC. A real bug caught by tests (token collision within the same second, fixed with a random `jti`). 66 backend tests. Details: [backend/CHANGELOG.md#phase-3--authentication](backend/CHANGELOG.md#phase-3--authentication).

## Phase 2 — Database Design

Backend: all 18 collections modeled in Mongoose with relationships, indexes, and schema-level validation. 31 backend tests. Details: [backend/CHANGELOG.md#phase-2--database-design](backend/CHANGELOG.md#phase-2--database-design).

## Phase 1 — Project Setup

- **backend/**: Express + TypeScript scaffold, env validation, MongoDB connection, logging, health checks, security middleware, Docker + docker-compose (API/Mongo/Redis), Jest + Supertest — all passing `lint`/`typecheck`/`build`/`test`.
- **admin-dashboard/**: Vite + React 19 + TypeScript, Tailwind v4, React Router v7 with an auth guard, an Axios instance with refresh-on-401, TanStack Query, a Zustand session store, and a working login → dashboard flow — passing `lint`/`typecheck`/`format:check`/`build`.
- **mobile-app/**: Flutter Clean Architecture (data/domain/presentation), Riverpod DI, a Dio client with refresh-on-401, GoRouter with an auth-aware redirect guard, and a full auth vertical slice (login/logout/session-restore) — hand-written but **not yet verified**, since this environment has no Flutter SDK (`flutter analyze`/`test` haven't run; see [mobile-app/README.md](mobile-app/README.md) for the one-time `flutter create .` step that finishes setup).

## Phase 0 — Architecture

Full system design, no code: system architecture, ER diagram, database schema, API contract, tech-stack rationale, auth flow, sequence diagrams, deployment topology. See [docs/architecture/](docs/architecture/).
