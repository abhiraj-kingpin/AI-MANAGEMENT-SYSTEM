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
| [`backend/`](backend/)                 | **v1.1.10** — all 20 roadmap phases complete, plus a Departments CRUD API, three report-naming fixes (Attendance, Leave, Salary/Payslip), a second face-registration path (`POST /face/register-embeddings`), three previously-documented gaps closed (real leave carry-forward, absence-detection sweep, analytics PDF export), face registration running a full real pipeline — SCRFD face detection, 5-point alignment, a real MobileFaceNet embedding model, and real MiniFASNet-V2 anti-spoofing, all via `onnxruntime-node` — instead of resizing a whole photo into a hash, recognition accuracy now real-measured against LFW (96.97%, also catching and fixing a badly-miscalibrated match threshold), and the anomaly-detection sweep now includes a real unsupervised ML check (Isolation Forest, fit fresh to the org's own attendance data every request) alongside its existing honest rule-based checks. See [backend/README.md](backend/README.md) for exactly what that does and doesn't cover. | 623 Jest tests passing, `lint`/`typecheck`/`build`/`docker-build` clean, verified green on GitHub Actions, no live database required |
| [`admin-dashboard/`](admin-dashboard/) | **Feature-complete against the original 20-phase roadmap.** Employees, Attendance, Leave, Shifts, Payroll, Notifications, Geofences, QR Codes, AI Insights (late-risk ranking, absenteeism forecast, anomalies), and a live Dashboard (KPIs + attendance-trend chart + department comparison) — every planned module is a real screen (see [admin-dashboard/README.md#features](admin-dashboard/README.md#features)). Building these surfaced and fixed four real backend gaps (Departments API, and employee-naming fixes for Attendance, Leave, and Salary/Payslip). | `lint`/`typecheck`/`format:check`/`build`/`test` clean — 19 Vitest + React Testing Library tests — verified on GitHub Actions (`ci-admin.yml`) |
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
| 8   | Face recognition                                                                                     | Done — backend registration/verification (`POST /face/register`'s photo→vector step now real SCRFD detection + alignment + a real MobileFaceNet model, not a hash — see [Component Status](#component-status)), plus real presentation-attack (liveness) detection on registration photos (MiniFASNet-V2), mobile check-in (real camera + on-device liveness + real on-device embedding, same MobileFaceNet model as the backend, with a geometric fallback, machine-verified via `ci-mobile.yml` — see [mobile-app/README.md#face-check-in](mobile-app/README.md#face-check-in)) and mobile registration (same embedding step, `POST /face/register-embeddings`) all built and wired to each other — see [#face-registration](mobile-app/README.md#face-registration). The backend's own recognition accuracy is now real-measured too (96.97% on LFW, the standard face-verification benchmark — see [backend/CHANGELOG.md](backend/CHANGELOG.md)'s `v1.1.9` entry), which also caught and fixed a badly-miscalibrated `FACE_MATCH_THRESHOLD` default. Two honest caveats remain: mobile's own end-to-end accuracy (a different landmark detector feeding the same model) hasn't been separately measured, and employees registered earlier via the original photo-upload path (or before the mobile embedding was real) need to re-register through the app once for their embeddings to actually match a check-in — see that section's Known Limitations |
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
| `ci-admin.yml`    | Push/PR touching `admin-dashboard/`  | lint, `format:check`, typecheck, `npm test` (Vitest), Vite build (see [Component Status](#component-status)) |
| `ci-mobile.yml`   | Push/PR touching `mobile-app/`       | `flutter analyze` + `flutter test` + a debug `flutter build apk` — all now genuinely verified (see [mobile-app/README.md#status](mobile-app/README.md#status)) |
| `deploy.yml`      | Push to `main`                       | Inert by default (gated on a `DEPLOY_ENABLED` repo variable) — the deploy-hook wiring for Render/Vercel projects that don't exist yet from this environment; a human with account access activates it, see the workflow file's header comment |

## Future Work

The 20-phase roadmap is complete end to end — backend, admin dashboard, and mobile app are all now feature-complete against it (see [Roadmap](#roadmap) and [Component Status](#component-status)). What's left is a short list of honestly-documented residual caveats, not missing screens:

- **Admin dashboard**: every module from the roadmap is a real screen, including AI Insights (Phase 15's late-risk ranking, absenteeism forecast, and anomaly sweep — backend-only until now). Now has a real test suite too (Vitest + React Testing Library, 19 tests covering RBAC nav-gating and other real logic — see [admin-dashboard/README.md#status](admin-dashboard/README.md#status)); page-level integration coverage is the natural next increment, not a current gap.
- **Mobile app**: auth, GPS/QR/Face check-in/check-out with offline-queue fallback, Face registration, self-service Leave, Payslips, a Notifications inbox, and a read-only Shifts view are all built (see [mobile-app/README.md#status](mobile-app/README.md#status)). Face check-in's embedding step now runs the same real MobileFaceNet model the backend does (`FaceEmbeddingGenerator`, via ONNX Runtime's Flutter binding), not the geometric placeholder it started as — written with no Flutter/Dart SDK available in this environment, then confirmed by `ci-mobile.yml`'s real Flutter toolchain (`flutter analyze`/`flutter test`/`flutter build apk` all passing — see [mobile-app/README.md#face-check-in](mobile-app/README.md#face-check-in) and its Status section for exactly what that first real run found and fixed). The original geometric placeholder (`GeometricEmbeddingGenerator`) is kept as a same-device fallback if real inference can't initialize, decided once per capture attempt rather than per-frame, so one attempt is never a mix of the two incompatible vector spaces. Face registration submits mobile's embedding to the backend as-is, so newly-registered employees' check-ins actually match each other, and should now match backend photo-registrations too, since both run the identical model — the backend side of that model is now real-measured at 96.97% accuracy on LFW (see [backend/CHANGELOG.md](backend/CHANGELOG.md)'s `v1.1.9` entry), though mobile's own end-to-end pipeline (ML Kit landmarks feeding the same model, not SCRFD) hasn't been separately measured; employees registered before this existed still need one re-registration. See [mobile-app/README.md#known-limitations](mobile-app/README.md#known-limitations).

See [Component Status](#component-status) for the up-to-date breakdown. Backend-specific known simplifications (placeholder external-service integrations, deferred automation) are itemized in [backend/README.md#known-simplifications--future-work](backend/README.md#known-simplifications--future-work).

## License

Proprietary — internal enterprise project (adjust before public release).
