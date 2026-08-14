# AI Management System

An enterprise workforce management platform: GPS/QR/face attendance, leave, shift scheduling, payroll, and notifications — a Node.js/Express/TypeScript backend, a React admin dashboard, and a Flutter mobile app, all against MongoDB.

## Table of Contents

- [Repository Layout](#repository-layout)
- [Architecture](#architecture)
- [Component Status](#component-status)
- [Roadmap](#roadmap)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Security & Performance](#security--performance)
- [CI/CD](#cicd)
- [Future Work](#future-work)
- [License](#license)

## Repository Layout

```
ai-management-system/
├── backend/            Express + TypeScript REST API — see backend/README.md
├── admin-dashboard/    React + Vite + TypeScript + Tailwind — see admin-dashboard/README.md
├── mobile-app/         Flutter (Clean Architecture + Riverpod) — see mobile-app/README.md
├── docs/architecture/  System design: schema, API contract, auth flow, deployment
├── CHANGELOG.md        Repository-wide build history
└── README.md           This file
```

Full folder trees for each project: [docs/architecture/05-folder-structure.md](docs/architecture/05-folder-structure.md).

## Architecture

**[docs/architecture/](docs/architecture/)** is the system-of-record for design decisions: system architecture, ER diagram, database schema, API contract, tech-stack rationale, auth flow, sequence diagrams, and deployment topology. Read it before making structural changes to any of the three projects.

At a glance: the backend is a layered modular monolith (one module per business domain, RBAC enforced at both the route and service layer); the admin dashboard and mobile app are both thin clients against the same REST API, sharing no code with the backend or each other.

## Component Status

| Project                                | State                                                                                                                                                                | Verification                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [`backend/`](backend/)                 | **v1.1.4** — all 20 roadmap phases complete, plus a Departments CRUD API, three report-naming fixes (Attendance, Leave, Salary/Payslip), and a second face-registration path (`POST /face/register-embeddings`) accepting client-computed embeddings so mobile check-in and registration can agree on one embedding method. See [backend/README.md](backend/README.md) for the full feature list and API reference. | 569 Jest tests passing, `lint`/`typecheck`/`build` clean, verified green on GitHub Actions (not just locally), no live database required |
| [`admin-dashboard/`](admin-dashboard/) | **Feature-complete against the original 20-phase roadmap.** Employees, Attendance, Leave, Shifts, Payroll, Notifications, Geofences, QR Codes, AI Insights (late-risk ranking, absenteeism forecast, anomalies), and a live Dashboard (KPIs + attendance-trend chart + department comparison) — every planned module is a real screen (see [admin-dashboard/README.md#features](admin-dashboard/README.md#features)). Building these surfaced and fixed four real backend gaps (Departments API, and employee-naming fixes for Attendance, Leave, and Salary/Payslip). | `lint`/`typecheck`/`format:check`/`build` clean, verified on GitHub Actions (`ci-admin.yml`)                                     |
| [`mobile-app/`](mobile-app/)           | **Feature-complete against the original 20-phase roadmap.** GPS/QR/Face check-in/check-out (Face's embedding step is an honestly-documented placeholder — see [mobile-app/README.md#face-check-in](mobile-app/README.md#face-check-in)) + Face registration (same on-device embedding, `POST /face/register-embeddings` — see [#face-registration](mobile-app/README.md#face-registration)) with attendance history and offline-queue fallback + self-service Leave (apply/cancel/balance) + Payslips (list + PDF download) + Notifications inbox + a read-only Shifts view. Hand-written without a Flutter SDK, machine-verified from Phase 20 onward once one became available. | `flutter analyze`: 0 issues; `flutter test`: 41/41 passing; `android`/`ios` scaffolded, debug APK verified building both locally and on CI — see [mobile-app/README.md#status](mobile-app/README.md#status) |

## Roadmap

| #   | Phase                                                                                                | Status                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | Architecture — ER diagram, DB schema, API docs, tech stack, auth flow, sequence diagrams, deployment | Done                                                                                                                                      |
| 1   | Project setup — backend/admin/mobile scaffolding                                                     | Done                                                                                                                                      |
| 2   | Database design                                                                                      | Done                                                                                                                                      |
| 3   | Authentication                                                                                       | Done                                                                                                                                      |
| 4   | Employee management                                                                                  | Done                                                                                                                                      |
| 5   | Attendance                                                                                           | Done                                                                                                                                      |
| 6   | GPS attendance                                                                                       | Done (backend and mobile app — see [mobile-app/README.md#attendance-gps-check-in](mobile-app/README.md#attendance-gps-check-in))          |
| 7   | QR attendance                                                                                        | Done (backend and mobile app — see [mobile-app/README.md#qr-check-in](mobile-app/README.md#qr-check-in))          |
| 8   | Face recognition                                                                                     | Done — backend registration/verification, mobile check-in (real camera + on-device liveness, placeholder embedding) and mobile registration (same on-device embedding, `POST /face/register-embeddings`) all built and wired to each other — see [mobile-app/README.md#face-check-in](mobile-app/README.md#face-check-in) and [#face-registration](mobile-app/README.md#face-registration). One honest caveat: employees registered earlier via the original photo-upload path need to re-register through the app once for their embeddings to actually match a check-in — see that section's Known Limitations |
| 9   | Leave management                                                                                     | Done (backend and mobile app — see [mobile-app/README.md#leave-applycancelbalance](mobile-app/README.md#leave-applycancelbalance))         |
| 10  | Shift management                                                                                     | Done (backend and mobile app — see [mobile-app/README.md#shifts](mobile-app/README.md#shifts))          |
| 11  | Payroll                                                                                              | Done (backend and mobile app — see [mobile-app/README.md#payslips-list--download](mobile-app/README.md#payslips-list--download)) |
| 12  | Notifications                                                                                        | Done (backend and mobile app — see [mobile-app/README.md#notifications-inbox](mobile-app/README.md#notifications-inbox))                  |
| 13  | Offline mode — queue, auto-sync, conflict resolution                                                 | Done — backend ([`POST /attendance/sync`](backend/README.md#attendance-attendance)) and mobile (Hive queue + connectivity listener, check-in only for now — see [mobile-app/README.md#offline-sync-attendance-queue](mobile-app/README.md#offline-sync-attendance-queue)) |
| 14  | Reports & analytics dashboard                                                                        | Done ([backend](backend/README.md#analytics-analytics) and admin-dashboard: KPI cards, attendance-trend chart, department comparison)                          |
| 15  | AI-assisted analytics                                                                                | Done — backend and admin-dashboard (see [admin-dashboard/README.md#features](admin-dashboard/README.md#features)'s AI Insights entry)                                                     |
| 16  | Security hardening                                                                                   | Done ([backend](backend/README.md#security-considerations))                                                                               |
| 17  | Performance                                                                                          | Done ([backend](backend/README.md#performance-notes))                                                                                     |
| 18  | Expanded test coverage                                                                               | Done ([backend](backend/README.md#testing))                                                                                               |
| 19  | Deployment pipeline                                                                                  | Done ([CI/CD](#cicd)) — actual Render/Vercel hosting still needs a human to create those accounts                                          |
| 20  | Documentation & release                                                                              | Done — backend tagged [`backend-v1.0.0`](backend/CHANGELOG.md#phase-20--documentation--release--v100)                                    |

Phase-by-phase build history — what shipped, what bugs a test caught, what was deliberately simplified and why — is in [CHANGELOG.md](CHANGELOG.md) (backend detail in [backend/CHANGELOG.md](backend/CHANGELOG.md)). Enterprise-extra features (visitor management, asset management, expense claims, multi-tenant, etc.) are tracked separately and layered on once the core 20 phases are stable.

## Technology Stack

| Layer            | Stack                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| Backend          | Node.js, Express, TypeScript, MongoDB (Mongoose)                                       |
| Admin Dashboard  | React 19, Vite, TypeScript, Tailwind CSS, React Router, Axios, TanStack Query, Zustand |
| Mobile           | Flutter, Riverpod, Dio, GoRouter, Hive, ML Kit + TFLite                                |
| Infra (targeted) | MongoDB Atlas, Cloudinary, Firebase Cloud Messaging, Redis, Render, Vercel, Docker     |

Full rationale for each choice: [docs/architecture/06-tech-stack-justification.md](docs/architecture/06-tech-stack-justification.md).

## Getting Started

Each project is independently runnable — see its README for exact steps:

- **Backend**: [backend/README.md#installation](backend/README.md#installation) — `npm install && npm run dev`, or `docker compose up --build` for API + MongoDB + Redis.
- **Admin dashboard**: [admin-dashboard/README.md](admin-dashboard/README.md) — `npm install && npm run dev`.
- **Mobile app**: [mobile-app/README.md](mobile-app/README.md) — `flutter pub get && flutter run`; `android`/`ios` are already scaffolded.

## Security & Performance

Backend-specific detail (auth model, RBAC enforcement, account lockout, rate limiting, indexing strategy, in-process caching) is in [backend/README.md#security-considerations](backend/README.md#security-considerations) and [backend/README.md#performance-notes](backend/README.md#performance-notes) — Phases 16 and 17, both complete.

## CI/CD

`.github/workflows/` (Phase 19):

| Workflow          | Runs on                              | What it actually checks                                                                                  |
| ------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ci-backend.yml`  | Push/PR touching `backend/`          | lint, `format:check`, typecheck, the full Jest suite, `tsc` build, and a Docker image build — all real, no live database needed |
| `ci-admin.yml`    | Push/PR touching `admin-dashboard/`  | lint, `format:check`, typecheck, Vite build — no test step, since none exists yet (see [Component Status](#component-status)) |
| `ci-mobile.yml`   | Push/PR touching `mobile-app/`       | `flutter analyze` + `flutter test` + a debug `flutter build apk` — all now genuinely verified (see [mobile-app/README.md#status](mobile-app/README.md#status)) |
| `deploy.yml`      | Push to `main`                       | Inert by default (gated on a `DEPLOY_ENABLED` repo variable) — the deploy-hook wiring for Render/Vercel projects that don't exist yet from this environment; a human with account access activates it, see the workflow file's header comment |

## Future Work

The 20-phase roadmap is complete end to end — backend, admin dashboard, and mobile app are all now feature-complete against it (see [Roadmap](#roadmap) and [Component Status](#component-status)). What's left is a short list of honestly-documented residual caveats, not missing screens:

- **Admin dashboard**: every module from the roadmap is a real screen, including AI Insights (Phase 15's late-risk ranking, absenteeism forecast, and anomaly sweep — backend-only until now). No frontend test suite exists yet for either web client (see each one's own README for why).
- **Mobile app**: auth, GPS/QR/Face check-in/check-out with offline-queue fallback, Face registration, self-service Leave, Payslips, a Notifications inbox, and a read-only Shifts view are all built (see [mobile-app/README.md#status](mobile-app/README.md#status)). Face check-in's embedding step is an honestly-documented placeholder (real camera + real on-device liveness, but not a trained recognition model — no GPU/model-bundling available in this environment, the same constraint the backend's own registration placeholder already documents); Face registration now submits that same on-device embedding to the backend, so newly-registered employees' check-ins actually match — employees registered before this existed need one re-registration for the same to be true of them. See [mobile-app/README.md#known-limitations](mobile-app/README.md#known-limitations).

See [Component Status](#component-status) for the up-to-date breakdown. Backend-specific known simplifications (placeholder external-service integrations, deferred automation) are itemized in [backend/README.md#known-simplifications--future-work](backend/README.md#known-simplifications--future-work).

## License

Proprietary — internal enterprise project (adjust before public release).
