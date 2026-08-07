# AI Management System — Backend

REST API for the AI Management System platform: employee records, GPS/QR/face attendance, leave, shift scheduling, payroll, and notifications. Node.js + Express + TypeScript + MongoDB.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Build & Scripts](#build--scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Performance Notes](#performance-notes)
- [Known Simplifications & Future Work](#known-simplifications--future-work)
- [License](#license)

## Overview

This service is the single source of truth for a company's workforce data: who works where, when they showed up, how much leave they have left, what they're paid, and what shift they're on. It's consumed by a React admin dashboard and a Flutter mobile app (see the [repository root](../README.md)).

Full system design — ER diagram, database schema, API contract, auth flow, sequence diagrams — lives in [`docs/architecture/`](../docs/architecture/). Build history, including every deliberate simplification and every bug a test caught before it shipped, is in [CHANGELOG.md](CHANGELOG.md).

## Architecture

A layered modular monolith — one module per business domain (`src/modules/<domain>/`), each following the same internal shape:

```
<domain>.model.ts       Mongoose schema + hydrated document type
<domain>.types.ts       API-facing DTO + doc→DTO mapper
<domain>.validators.ts  Zod request schemas
<domain>.service.ts     Business logic, RBAC scoping, DB access
<domain>.controller.ts  Thin HTTP glue (parse → call service → respond)
<domain>.routes.ts      Express Router: middleware chain + wiring
```

Requests flow `routes → middlewares (auth, RBAC, validation) → controller → service → model`. RBAC is enforced at two levels, deliberately: whole-role gates (e.g. "only HR/Admin can list salaries") live at the route via `requireRole`; per-resource scoping (e.g. "a Manager can only see their own team") lives inside the service, since it depends on _which_ record, not just the caller's role.

Cross-module reuse goes through `src/shared/`, not through one module importing another module's internals — e.g. `shared/utils/actor.ts` (reading the authenticated caller off a request), `shared/utils/teamScope.ts` (manager→reports lookup, used by both attendance and leave), `shared/errors/AppError.ts` (the one exception type every route handler can throw and have turned into a correct HTTP response).

## Features

| Domain               | What it does                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**   | JWT access + rotating refresh tokens, reuse detection, RBAC (`super_admin`/`hr`/`manager`/`employee`), forgot/reset/change password                      |
| **Employees**        | CRUD, profile photo + document upload (Cloudinary), search, department/status filtering, manager-scoped visibility                                       |
| **Attendance**       | Check-in/out, breaks, working-hours/overtime/half-day computation, offline-punch sync, HR reporting with Excel/PDF export, two-track correction workflow |
| **GPS Attendance**   | Geofenced check-in via indexed `$geoNear` distance queries                                                                                               |
| **QR Attendance**    | Time-boxed, HMAC-signed, optionally single-use QR codes                                                                                                  |
| **Face Recognition** | Registration, cosine-similarity verification, liveness-gated                                                                                             |
| **Leave Management** | Apply/cancel/approve/reject, real business-day + holiday-aware balance accounting                                                                        |
| **Shift Management** | Shift definitions, single/bulk assignment, drives attendance's late/overtime math                                                                        |
| **Payroll**          | Salary structures, attendance-driven payslip computation, batch generation, PDF payslips                                                                 |
| **Notifications**    | In-app feed, read/unread state, broadcasts, device-token registration                                                                                    |
| **Analytics**        | Dashboard KPIs, monthly attendance-trend, cross-department comparison, CSV export — real aggregation over Employee/Attendance, team-scoped for Managers  |

Two features have one real external-service seam each that can't be exercised in this environment (no GPU/ML runtime, no Firebase project) — everything else in those features is fully real. See [Known Simplifications](#known-simplifications--future-work).

## Technology Stack

| Concern             | Choice                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| Runtime / language  | Node.js ≥20, TypeScript (strict mode)                                   |
| Framework           | Express 4                                                               |
| Database            | MongoDB via Mongoose 8                                                  |
| Validation          | Zod (request schemas, `env` schema)                                     |
| Auth                | `jsonwebtoken`, `bcryptjs`                                              |
| File storage        | Cloudinary (via Multer memory storage — uploads never touch local disk) |
| Documents           | ExcelJS, PDFKit, `qrcode`                                               |
| Logging             | Winston (structured) + Morgan (HTTP access log piped through Winston)   |
| Security middleware | Helmet, CORS allowlist, `express-rate-limit`                            |
| Testing             | Jest + Supertest + ts-jest                                              |
| Lint / format       | ESLint (flat config, typescript-eslint) + Prettier                      |

## Installation

```bash
cp .env.example .env      # fill in real values, or point MONGO_URI at the docker-compose mongo
npm install
npm run dev                # tsx watch — http://localhost:5000
```

### With Docker (API + MongoDB + Redis)

```bash
docker compose up --build
```

Redis is provisioned in `docker-compose.yml` for future use (rate-limit store, job queue) but no application code depends on it yet — see [Known Simplifications](#known-simplifications--future-work).

## Configuration

All environment variables are validated at boot via `src/config/env.ts` (Zod) — the process refuses to start if a required one is missing. Full list with inline comments: [`.env.example`](.env.example).

| Group                | Variables                                                                                               | Required?                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Core                 | `NODE_ENV`, `PORT`, `API_PREFIX`                                                                        | Defaults provided                                  |
| Database             | `MONGO_URI`                                                                                             | **Required**                                       |
| JWT                  | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `QR_TOKEN_SECRET` | Secrets **required**; expiries default             |
| CORS / rate limiting | `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`                                        | Defaults provided                                  |
| Cloudinary           | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                  | Optional — uploads fail without them               |
| Firebase (push)      | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`                                  | Optional — push logs to console without them       |
| SMTP (email)         | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                                                      | Optional — reset links log to console without them |
| Attendance tuning    | `FACE_MATCH_THRESHOLD`, `QR_DEFAULT_VALID_MINUTES`                                                      | Defaults provided                                  |
| Observability        | `SENTRY_DSN`, `LOG_LEVEL`                                                                               | Optional                                           |
| Redis                | `REDIS_URL`                                                                                             | Reserved, not yet consumed                         |

## Project Structure

```
src/
├── config/        # env validation, MongoDB connection + model registry, Winston logger
├── middlewares/   # authenticate, requireRole, validate, error handler, 404 handler
├── modules/       # one folder per domain — see Architecture
│   ├── auth/ employees/ departments/ users/
│   ├── attendance/ geofence/ qr/ face-recognition/
│   ├── leaves/ shifts/ payroll/ notifications/
│   └── audit/ health/
├── shared/        # AppError, response envelope, RBAC role constants, cross-module utils
├── app.ts         # Express app assembly: middleware chain, route mounts, error handling
└── server.ts      # boot: connect DB → listen → graceful shutdown on SIGTERM/SIGINT
tests/
├── models/        # schema-validation tests (validateSync, no live DB)
├── modules/       # <domain>.service.test.ts (mocked models) + <domain>.routes.test.ts (RBAC/validation via supertest)
└── shared/        # pure-function/unit tests for shared/utils
```

Full target structure for the whole repo (mobile + admin + backend): [`docs/architecture/05-folder-structure.md`](../docs/architecture/05-folder-structure.md).

## API Reference

All routes are mounted under `API_PREFIX` (`/api/v1` by default). Full request/response contracts: [`docs/architecture/04-api-documentation.md`](../docs/architecture/04-api-documentation.md).

### Health

| Method | Path            | Description                             |
| ------ | --------------- | --------------------------------------- |
| GET    | `/health/live`  | Process liveness, no dependencies       |
| GET    | `/health/ready` | Readiness — checks MongoDB connectivity |

### Authentication (`/auth`)

| Method | Path                    | Access                       | Notes                                                                         |
| ------ | ----------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| POST   | `/auth/register`        | Super Admin/HR               | HR cannot mint `hr`/`super_admin` accounts                                    |
| POST   | `/auth/login`           | Public                       | Rate-limited 5/min/IP; refresh token as httpOnly cookie (web) + body (mobile) |
| POST   | `/auth/refresh`         | Public (valid refresh token) | Rotates the token; detects reuse of an already-rotated one                    |
| POST   | `/auth/logout`          | Authenticated                | Clears the stored session hash + cookie                                       |
| POST   | `/auth/forgot-password` | Public                       | Same response whether or not the email exists                                 |
| POST   | `/auth/reset-password`  | Public (valid reset token)   | Hashed, time-boxed token                                                      |
| POST   | `/auth/change-password` | Authenticated                | Requires current-password confirmation                                        |
| GET    | `/auth/me`              | Authenticated                | Current user + linked employee summary                                        |

### Employees (`/employees`)

| Method     | Path                       | Access                                                                          | Notes                                                                   |
| ---------- | -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| POST       | `/employees`               | Super Admin/HR                                                                  | Creates linked `User` (temp password) + `Employee` in one call          |
| GET        | `/employees`               | Super Admin/HR/Manager                                                          | Paginated, filterable, `$text`-searchable; Manager forced to their team |
| GET        | `/employees/search?q=`     | Super Admin/HR/Manager                                                          | Typeahead                                                               |
| GET        | `/employees/:id`           | Authenticated                                                                   | Scoped in-service: any HR/Admin, own team (Manager), or self            |
| PATCH      | `/employees/:id`           | Super Admin/HR (any field) / self (`phone`, `address`, `emergencyContact` only) |                                                                         |
| DELETE     | `/employees/:id`           | Super Admin/HR                                                                  | Soft-delete + deactivates login                                         |
| POST       | `/employees/:id/image`     | Super Admin/HR/self                                                             | Cloudinary upload                                                       |
| POST`/GET` | `/employees/:id/documents` | Super Admin/HR/self                                                             | Cloudinary upload/list                                                  |

### Attendance (`/attendance`)

| Method | Path                                                       | Access                 | Notes                                                                   |
| ------ | ---------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| POST   | `/attendance/check-in`                                     | Self                   | `method: manual\|gps\|qr\|face`; `manual` is HR/Admin-only              |
| POST   | `/attendance/check-out`                                    | Self                   |                                                                         |
| POST   | `/attendance/sync`                                         | Self                   | Bulk-applies offline-queued punches, idempotent via `clientGeneratedId` |
| POST   | `/attendance/break/start`, `/break/end`                    | Self                   |                                                                         |
| GET    | `/attendance/me?from=&to=`                                 | Self                   |                                                                         |
| GET    | `/attendance`                                              | Super Admin/HR/Manager | Paginated report, Manager team-scoped                                   |
| GET    | `/attendance/export/excel`, `/export/pdf`                  | Super Admin/HR         | Capped at 5,000 rows                                                    |
| PATCH  | `/attendance/:id/correct`                                  | Super Admin/HR         | Direct edit, audit-logged                                               |
| POST   | `/attendance/:id/request-correction`                       | Self                   |                                                                         |
| POST   | `/attendance/:id/approve-correction`, `/reject-correction` | Super Admin/HR/Manager | Team-scoped for Manager                                                 |

### GPS / Geofencing (`/geofences`)

| Method | Path                          | Access         | Notes                                                |
| ------ | ----------------------------- | -------------- | ---------------------------------------------------- |
| GET    | `/geofences`                  | Super Admin/HR | `?includeInactive=true`                              |
| POST   | `/geofences`                  | Super Admin/HR | `{branchName, center:{lat,lng}, radiusMeters}`       |
| PATCH  | `/geofences/:id`              | Super Admin/HR | Partial update                                       |
| DELETE | `/geofences/:id`              | Super Admin/HR | Deactivates, never hard-deletes                      |
| GET    | `/geofences/nearby?lat=&lng=` | Super Admin/HR | Debug: every active geofence in reach, nearest first |

### QR Attendance (`/qr`)

| Method | Path                     | Access         | Notes                                        |
| ------ | ------------------------ | -------------- | -------------------------------------------- |
| POST   | `/qr/generate`           | Super Admin/HR | `{geofenceId, validForMinutes?, singleUse?}` |
| GET    | `/qr/active?geofenceId=` | Super Admin/HR | Currently-valid code for a branch            |
| POST   | `/qr/:id/revoke`         | Super Admin/HR | Expires immediately                          |

### Face Recognition (`/face`)

| Method | Path                        | Access                                 | Notes                          |
| ------ | --------------------------- | -------------------------------------- | ------------------------------ |
| POST   | `/face/register`            | Self, or HR/Admin for another employee | 3–5 photos                     |
| GET    | `/face/registration-status` | Self, or HR/Admin via `?employeeId=`   |                                |
| POST   | `/face/verify`              | Self                                   | Standalone test endpoint       |
| DELETE | `/face/:employeeId`         | Super Admin/HR                         | Hard delete (right-to-erasure) |

### Leave (`/leaves`, `/leave-types`, `/holidays`)

| Method   | Path                             | Access                                     | Notes                                               |
| -------- | -------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| POST     | `/leaves`                        | Self                                       | Overlap/balance/business-day checks before creation |
| GET      | `/leaves/me?status=`             | Self                                       |                                                     |
| GET      | `/leaves/balance`                | Self                                       | Per leave-type, current year                        |
| PATCH    | `/leaves/:id/cancel`             | Self                                       |                                                     |
| GET      | `/leaves`                        | Super Admin/HR/Manager                     | Review queue, team-scoped for Manager               |
| PATCH    | `/leaves/:id/approve`, `/reject` | Super Admin/HR/Manager                     |                                                     |
| GET/POST | `/leave-types`                   | Read: authenticated. Write: Super Admin/HR |                                                     |
| GET/POST | `/holidays?year=`                | Read: authenticated. Write: Super Admin/HR |                                                     |

### Shifts (`/shifts`)

| Method       | Path                  | Access         | Notes                               |
| ------------ | --------------------- | -------------- | ----------------------------------- |
| GET/POST     | `/shifts`             | Super Admin/HR | Shift definitions                   |
| PATCH/DELETE | `/shifts/:id`         | Super Admin/HR | Update / deactivate                 |
| POST         | `/shifts/assign`      | Super Admin/HR | Single employee                     |
| POST         | `/shifts/assign/bulk` | Super Admin/HR | Per-employee success/failure report |
| GET          | `/shifts/me`          | Self           | Current effective shift             |

### Payroll (`/salaries`, `/payroll`, `/payslips`)

| Method   | Path                          | Access                                             | Notes                                      |
| -------- | ----------------------------- | -------------------------------------------------- | ------------------------------------------ |
| GET/POST | `/salaries`                   | Super Admin/HR                                     | Base salary structure                      |
| PATCH    | `/salaries/:employeeId`       | Super Admin/HR                                     | Allowances/deductions merged, not replaced |
| POST     | `/payroll/run`                | Super Admin/HR                                     | `{month, departmentId?}` → `{runId}`       |
| GET      | `/payroll/runs/:runId/status` | Super Admin/HR                                     | Poll batch progress                        |
| GET      | `/payslips`                   | Super Admin/HR                                     | Filterable list                            |
| GET      | `/payslips/me?month=`         | Self                                               | Released payslips only                     |
| GET      | `/payslips/:id/pdf`           | Self (own, released) / Super Admin/HR (any status) |                                            |
| PATCH    | `/payslips/:id/release`       | Super Admin/HR                                     | `generated` → `released`                   |

### Notifications (`/notifications`)

| Method | Path                                   | Access         | Notes                          |
| ------ | -------------------------------------- | -------------- | ------------------------------ |
| GET    | `/notifications/me?unread=`            | Self           | Own + broadcasts               |
| PATCH  | `/notifications/:id/read`, `/read-all` | Self           |                                |
| POST   | `/notifications/broadcast`             | Super Admin/HR | Company-wide or per-department |
| POST   | `/notifications/device-token`          | Self           | Registers an FCM token         |

### Analytics (`/analytics`)

| Method | Path                                | Access                  | Notes                                                                                                              |
| ------ | ------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/analytics/dashboard`              | Super Admin/HR/Manager  | Headcount + attendance/late/leave rate for one day; team-scoped for Manager, optional `departmentId` for HR/Admin |
| GET    | `/analytics/attendance-trend`       | Super Admin/HR/Manager  | Attendance/late rate per month, trailing `months` (1–24, default 6), against real business-day counts             |
| GET    | `/analytics/department-comparison`  | Super Admin/HR          | Headcount + rates for every active department, one day                                                            |
| GET    | `/analytics/export/csv`             | Super Admin/HR          | Raw per-record attendance CSV for a `from`/`to` date range, optional `departmentId` (PDF export is not yet built) |

## Build & Scripts

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Hot-reload dev server (`tsx watch`)       |
| `npm run build`                   | Type-check and compile to `dist/`         |
| `npm start`                       | Run the compiled build (`dist/server.js`) |
| `npm run lint` / `lint:fix`       | ESLint                                    |
| `npm run format` / `format:check` | Prettier                                  |
| `npm run typecheck`               | `tsc --noEmit`                            |
| `npm test` / `test:watch`         | Jest + Supertest                          |

## Testing

458 Jest tests across every module, none requiring a live database:

- **`*.service.test.ts`** — business logic and RBAC scoping, with every Mongoose model mocked (`tests/utils/mockQuery.ts` simulates a chainable, thenable Mongoose `Query`).
- **`*.routes.test.ts`** — the real Express middleware chain (`authenticate` → `requireRole` → `validate`) via Supertest, covering everything that should reject _before_ touching the database (401/403/422).
- **`tests/models/*.test.ts`** — schema validation via Mongoose's in-process `validateSync()`.
- **`tests/shared/*.test.ts`** — pure-function coverage for cross-cutting utilities (business-day math, shift-duration math, vector similarity, team scoping, actor helpers).

```bash
npm test
```

## Deployment

Target topology (Render/Vercel/Atlas) and CI pipeline are documented in [`docs/architecture/09-deployment-architecture.md`](../docs/architecture/09-deployment-architecture.md). A `Dockerfile` and `docker-compose.yml` are provided for local/API+DB parity; container image publishing and the production pipeline are Phase 19 work (see [Known Simplifications](#known-simplifications--future-work)).

## Security Considerations

- **Password storage**: bcrypt, cost factor 12, never returned by any query (`select: false` at the schema level).
- **Tokens**: short-lived access JWT (15 min) + rotating refresh JWT (7 d); only the refresh token's SHA-256 hash is persisted; reuse of an already-rotated refresh token is detected and rejected.
- **RBAC**: enforced at the route (`requireRole`) for whole-role gates and inside the service for per-resource scoping — a Manager's queries are always intersected with their own team server-side, never trusted from a client-supplied filter.
- **Rate limiting**: global limiter on all routes, a stricter one on `/auth/login` and `/auth/forgot-password`.
- **Transport hardening**: Helmet default headers, explicit CORS allowlist (`CORS_ALLOWED_ORIGINS`), `cookie-parser` with httpOnly refresh cookies.
- **Trust boundaries respected, not assumed**: QR tokens are signed with a secret independent of the session JWT secrets (a QR code is physically displayed and can be photographed); face-attendance liveness must be explicitly `true`, never merely present, since the server cannot re-derive liveness itself from a single embedding.
- **Biometric data**: face embeddings are the one entity in this codebase that is hard-deleted (not soft-deleted) on request, for genuine right-to-erasure.
- **Known gap**: no account-lockout after repeated failed logins yet (the login rate limiter is the interim mitigation) — tracked for the security-hardening phase.

## Performance Notes

- **Geospatial queries** use a single indexed `$geoNear` aggregation against Geofence's `2dsphere` index — not an application-level distance loop over every branch.
- **`employeeCode` generation** uses the standard MongoDB atomic-counter pattern (`findByIdAndUpdate` + `$inc`), safe under concurrent creates without a count-then-use race.
- **Pagination everywhere** a list can grow unbounded (employees, attendance, leaves, payslips, salaries); exports are hard-capped at 5,000 rows rather than streaming unbounded result sets.
- **Compound/unique indexes** back the hot query paths — notably `{employeeId, date}` on Attendance and `{employeeId, month}` on Payslip — see [`docs/architecture/03-database-schema.md`](../docs/architecture/03-database-schema.md).
- **Not yet done**: response caching, connection-pool tuning, and load testing are Phase 17 scope.

## Known Simplifications & Future Work

Two external-service integrations are intentionally-labeled placeholders — the code paths around them are fully real and tested, only the actual external call is stubbed, because this environment has no credentials to call the real service with:

| Seam                          | Where                                        | What's real                                                                                                                | What's stubbed                                                                                                                                                      |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Face embedding generation     | `face-recognition/faceEmbedding.provider.ts` | Registration flow, cosine-similarity matching, liveness gating, confidence thresholding                                    | The photo→vector step itself (needs a real FaceNet/MobileFaceNet model — no GPU/model runtime here); deterministically hashes image bytes instead                   |
| Push notification delivery    | `notifications/push.service.ts`              | Notification persistence, read state, triggers wired into leave/payroll/shift/attendance events, device-token registration | The actual Firebase Cloud Messaging network call (no Firebase project/credentials here); logs what would be sent                                                    |
| Payroll batch job queue       | `payroll/payrollRun.service.ts`              | The payroll computation itself, run status tallying, per-employee failure isolation                                        | Job durability across a process restart — an in-memory map stands in for BullMQ/Redis, which is provisioned in `docker-compose.yml` but not wired into any code yet |
| Password-reset email delivery | `notifications/email.service.ts`             | Token generation, hashing, expiry                                                                                          | The actual SMTP send — logs the reset link when no `SMTP_HOST` is configured                                                                                        |

**Offline sync is a different kind of gap — not a stub, a missing counterpart.** `POST /attendance/sync` (see [API Reference](#api-reference)) is the real, fully-tested backend half of the flow in [`docs/architecture/08-sequence-diagrams.md#5-offline-attendance-sync`](../docs/architecture/08-sequence-diagrams.md): idempotent via `clientGeneratedId`, re-runs the same GPS/QR/face/shift checks a live check-in would against the punch's original `occurredAt`, and never silently drops a conflicting punch (surfaced as `status: "conflict"` with the reason code, and audit-logged). What doesn't exist in this repository is the _mobile_ half — the Hive local queue, connectivity listener, and retry logic are Flutter code, and this environment has no Flutter SDK to build or verify it against. The API contract is ready for it; the client isn't built yet.

Other known, documented gaps:

- **Leave carry-forward**: `LeaveType.carryForward`/`maxCarryForwardDays` are read by the balance math but nothing yet computes a year-end rollover automatically — needs a scheduled job.
- **Absence detection**: `Attendance` has an `absent` status in its schema, but nothing currently creates one — that requires a scheduled "no check-in by end of day" sweep compared against each employee's expected working days.
- **No DB transactions**: employee creation (User + Employee) and a few other multi-document writes are sequential, not transactional — acceptable on a single-node MongoDB (not a replica set) for now, revisited once running against Atlas.
- **Only one `clientGeneratedId` is retained per attendance record**: the schema (by design, from Phase 0) stores a single idempotency key per document, not one per punch. A check-out punch's sync call overwrites the field a check-in punch's sync call set. In practice this is safe — the mobile client deletes a punch from its local queue the moment it gets back `applied`/`duplicate`, so an older punch is never resubmitted after a newer one has already landed — but it's a narrow theoretical gap worth naming rather than silently assuming away.

Remaining platform-level phases (a mobile offline-sync client, AI-assisted insights, formal security hardening, performance tuning, CI/CD, and consolidated docs) are tracked at the [repository root](../README.md).

## License

Proprietary — internal enterprise project.
