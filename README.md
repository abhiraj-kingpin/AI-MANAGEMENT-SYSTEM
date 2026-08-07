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
| [`backend/`](backend/)                 | 17 of 20 roadmap phases complete — authentication through performance. See [backend/README.md](backend/README.md) for the full feature list and API reference. | 512 Jest tests passing, `lint`/`typecheck`/`build` clean, no live database required                                             |
| [`admin-dashboard/`](admin-dashboard/) | Project scaffold + authenticated shell (login → dashboard, token refresh). Feature screens land alongside their backend phase.                                       | `lint`/`typecheck`/`format:check`/`build` clean                                                                                 |
| [`mobile-app/`](mobile-app/)           | Clean-Architecture scaffold + full auth vertical slice (login/logout/session-restore). Hand-written, not yet machine-verified — this environment has no Flutter SDK. | `flutter analyze`/`test` not yet run; see [mobile-app/README.md](mobile-app/README.md) for the one-time `flutter create .` step |

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
| 13  | Offline mode — queue, auto-sync, conflict resolution                                                 | Partial — backend done ([`POST /attendance/sync`](backend/README.md#attendance-attendance)); mobile Hive queue not built (no Flutter SDK in this environment) |
| 14  | Reports & analytics dashboard                                                                        | Done ([backend](backend/README.md#analytics-analytics)); admin-dashboard KPI wiring in progress                                          |
| 15  | AI-assisted analytics                                                                                | Done ([backend](backend/README.md#analytics-analytics)); admin-dashboard UI not built                                                     |
| 16  | Security hardening                                                                                   | Done ([backend](backend/README.md#security-considerations))                                                                               |
| 17  | Performance                                                                                          | Done ([backend](backend/README.md#performance-notes))                                                                                     |
| 18  | Expanded test coverage                                                                               | Planned                                                                                                                                   |
| 19  | Deployment pipeline                                                                                  | Planned                                                                                                                                   |
| 20  | Documentation & release                                                                              | Planned                                                                                                                                   |

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
- **Mobile app**: [mobile-app/README.md](mobile-app/README.md) — requires a one-time `flutter create .` in this environment (no Flutter SDK available to have run it already).

## Security & Performance

Backend-specific detail (auth model, RBAC enforcement, rate limiting, indexing strategy) is in [backend/README.md#security-considerations](backend/README.md#security-considerations) and [backend/README.md#performance-notes](backend/README.md#performance-notes). Formal security-hardening and performance passes are scoped as Phases 16-17 of the roadmap above.

## Future Work

The mobile half of offline sync (a Hive local queue, connectivity listener, and retry logic against the now-real `POST /attendance/sync` API) is still unbuilt — this environment has no Flutter SDK to build or verify it. The remaining roadmap (Phases 14-20) covers analytics dashboards, AI-assisted insights, formal security hardening, performance tuning, expanded testing, a deployment pipeline, and consolidated documentation. Backend-specific known simplifications (placeholder external-service integrations, deferred automation) are itemized in [backend/README.md#known-simplifications--future-work](backend/README.md#known-simplifications--future-work).

Both client applications (admin dashboard and mobile app) also still need their feature UI designed and built out — see [Component Status](#component-status). The backend's API surface for employees, attendance, leave, shifts, payroll, and notifications is ready and waiting for both.

## License

Proprietary — internal enterprise project (adjust before public release).
