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
| [`backend/`](backend/)                 | **v1.1.2** — all 20 roadmap phases complete, plus a Departments CRUD API and two report-naming fixes (Attendance, Leave), all found while building the admin dashboard. See [backend/README.md](backend/README.md) for the full feature list and API reference. | 559 Jest tests passing, `lint`/`typecheck`/`build` clean, verified green on GitHub Actions (not just locally), no live database required |
| [`admin-dashboard/`](admin-dashboard/) | Auth + live Dashboard KPIs + Employees (full CRUD) + Attendance (report, filters, corrections) + Leave (self-service apply/cancel/balance for every role, review queue for Super Admin/HR/Manager). Building these three surfaced and fixed three real backend gaps (Departments API, Attendance employee names, Leave employee/leave-type names). Remaining feature screens land alongside their own passes — see [admin-dashboard/README.md#features](admin-dashboard/README.md#features). | `lint`/`typecheck`/`format:check`/`build` clean, verified on GitHub Actions (`ci-admin.yml`)                                     |
| [`mobile-app/`](mobile-app/)           | Clean-Architecture scaffold + full auth vertical slice (login/logout/session-restore). Hand-written without a Flutter SDK, machine-verified in Phase 20 once one became available. | `flutter analyze`: 0 issues; `flutter test`: 4/4 passing; `android`/`ios` scaffolded — see [mobile-app/README.md#status](mobile-app/README.md#status) |

## Roadmap

| #   | Phase                                                                                                | Status                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | Architecture — ER diagram, DB schema, API docs, tech stack, auth flow, sequence diagrams, deployment | Done                                                                                                                                      |
| 1   | Project setup — backend/admin/mobile scaffolding                                                     | Done                                                                                                                                      |
| 2   | Database design                                                                                      | Done                                                                                                                                      |
| 3   | Authentication                                                                                       | Done                                                                                                                                      |
| 4   | Employee management                                                                                  | Done                                                                                                                                      |
| 5   | Attendance                                                                                           | Done                                                                                                                                      |
| 6   | GPS attendance                                                                                       | Done                                                                                                                                      |
| 7   | QR attendance                                                                                        | Done                                                                                                                                      |
| 8   | Face recognition                                                                                     | Done                                                                                                                                      |
| 9   | Leave management                                                                                     | Done                                                                                                                                      |
| 10  | Shift management                                                                                     | Done                                                                                                                                      |
| 11  | Payroll                                                                                              | Done                                                                                                                                      |
| 12  | Notifications                                                                                        | Done                                                                                                                                      |
| 13  | Offline mode — queue, auto-sync, conflict resolution                                                 | Partial — backend done ([`POST /attendance/sync`](backend/README.md#attendance-attendance)); mobile Hive queue not built yet |
| 14  | Reports & analytics dashboard                                                                        | Done ([backend](backend/README.md#analytics-analytics)); admin-dashboard KPI cards done, trend charts not built                          |
| 15  | AI-assisted analytics                                                                                | Done ([backend](backend/README.md#analytics-analytics)); admin-dashboard UI not built                                                     |
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

The backend's 20-phase roadmap is complete (see [Roadmap](#roadmap)); what remains is the two clients catching up to an API surface that's ready and waiting for them:

- **Admin dashboard**: Employees (list/search/filter/create/edit/deactivate), Attendance (report, filters, corrections), and Leave (self-service + review queue) are built; Shifts, Payroll, Notifications, Geofences, QR, and the analytics trend-chart/department-comparison panel are still unbuilt.
- **Mobile app**: only the auth vertical slice is built. Check-in (GPS/QR/face), leave, shifts, payslips, notifications, and the offline sync half (a Hive local queue, connectivity listener, and retry logic against the now-real `POST /attendance/sync` API) are all still unbuilt — a scope gap now, not a tooling one, since Phase 20 got a real Flutter SDK verifying this codebase for the first time (see [mobile-app/README.md#status](mobile-app/README.md#status)).

See [Component Status](#component-status) for the up-to-date breakdown. Backend-specific known simplifications (placeholder external-service integrations, deferred automation) are itemized in [backend/README.md#known-simplifications--future-work](backend/README.md#known-simplifications--future-work).

## License

Proprietary — internal enterprise project (adjust before public release).
