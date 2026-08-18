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

| Domain                    | What it does                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**        | JWT access + rotating refresh tokens, reuse detection, RBAC (`super_admin`/`hr`/`manager`/`employee`), forgot/reset/change password                                              |
| **Employees**             | CRUD, profile photo + document upload (Cloudinary), search, department/status filtering, manager-scoped visibility                                                               |
| **Departments**           | CRUD (Super Admin/HR), read open to any authenticated user — every employee-creation form and filter dropdown needs the list regardless of role                                  |
| **Attendance**            | Check-in/out, breaks, working-hours/overtime/half-day computation, offline-punch sync, HR reporting with Excel/PDF export, two-track correction workflow                         |
| **GPS Attendance**        | Geofenced check-in via indexed `$geoNear` distance queries                                                                                                                       |
| **QR Attendance**         | Time-boxed, HMAC-signed, optionally single-use QR codes                                                                                                                          |
| **Face Recognition**      | Registration, cosine-similarity verification, liveness-gated                                                                                                                     |
| **Leave Management**      | Apply/cancel/approve/reject, real business-day + holiday-aware balance accounting                                                                                                |
| **Shift Management**      | Shift definitions, single/bulk assignment, drives attendance's late/overtime math                                                                                                |
| **Payroll**               | Salary structures, attendance-driven payslip computation, batch generation, PDF payslips                                                                                         |
| **Notifications**         | In-app feed, read/unread state, broadcasts, device-token registration                                                                                                            |
| **Analytics**             | Dashboard KPIs, monthly attendance-trend, cross-department comparison, CSV export — real aggregation over Employee/Attendance, team-scoped for Managers                          |
| **AI-Assisted Analytics** | Late-risk ranking, absenteeism trend + forecast, rule-based fraud/anomaly sweep — real statistics (rates, trend, z-scores, cosine similarity), explicitly not a trained ML model |
| **Security**              | Account lockout after repeated failed logins, an append-only audit trail with a Super-Admin-only read API                                                                        |

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

| Method | Path                    | Access                       | Notes                                                                                                                               |
| ------ | ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`        | Super Admin/HR               | HR cannot mint `hr`/`super_admin` accounts                                                                                          |
| POST   | `/auth/login`           | Public                       | Rate-limited 5/min/IP; locks the account for 15 min after 5 wrong passwords; refresh token as httpOnly cookie (web) + body (mobile) |
| POST   | `/auth/refresh`         | Public (valid refresh token) | Rotates the token; detects reuse of an already-rotated one                                                                          |
| POST   | `/auth/logout`          | Authenticated                | Clears the stored session hash + cookie                                                                                             |
| POST   | `/auth/forgot-password` | Public                       | Same response whether or not the email exists                                                                                       |
| POST   | `/auth/reset-password`  | Public (valid reset token)   | Hashed, time-boxed token                                                                                                            |
| POST   | `/auth/change-password` | Authenticated                | Requires current-password confirmation                                                                                              |
| GET    | `/auth/me`              | Authenticated                | Current user + linked employee summary                                                                                              |

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

### Departments (`/departments`)

| Method | Path               | Access         | Notes                                                                   |
| ------ | ------------------ | -------------- | ----------------------------------------------------------------------- |
| GET    | `/departments`     | Authenticated  | `?includeInactive=true` to see deactivated ones; active-only by default |
| POST   | `/departments`     | Super Admin/HR | `{ name, code, headOfDepartment? }` — `code` is uppercased              |
| PATCH  | `/departments/:id` | Super Admin/HR | Partial update, including deactivating (`isActive: false`)              |

### Attendance (`/attendance`)

| Method | Path                                                       | Access                 | Notes                                                                                                                                           |
| ------ | ---------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/attendance/check-in`                                     | Self                   | `method: manual\|gps\|qr\|face`; `manual` is HR/Admin-only                                                                                      |
| POST   | `/attendance/check-out`                                    | Self                   |                                                                                                                                                 |
| POST   | `/attendance/sync`                                         | Self                   | Bulk-applies offline-queued punches, idempotent via `clientGeneratedId`                                                                         |
| POST   | `/attendance/break/start`, `/break/end`                    | Self                   |                                                                                                                                                 |
| GET    | `/attendance/me?from=&to=`                                 | Self                   |                                                                                                                                                 |
| GET    | `/attendance`                                              | Super Admin/HR/Manager | Paginated report, Manager team-scoped; each row includes an `employee` name/code (one batch lookup per page, not per row)                       |
| GET    | `/attendance/export/excel`, `/export/pdf`                  | Super Admin/HR         | Capped at 5,000 rows                                                                                                                            |
| PATCH  | `/attendance/:id/correct`                                  | Super Admin/HR         | Direct edit, audit-logged                                                                                                                       |
| POST   | `/attendance/:id/request-correction`                       | Self                   |                                                                                                                                                 |
| POST   | `/attendance/:id/approve-correction`, `/reject-correction` | Super Admin/HR/Manager | Team-scoped for Manager                                                                                                                         |
| POST   | `/attendance/absence-sweep`                                | Super Admin/HR         | Marks every active employee with no record for a date `absent` — see [Known Simplifications & Future Work](#known-simplifications--future-work) |

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

| Method | Path                        | Access                                 | Notes                                                       |
| ------ | --------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| POST   | `/face/register`            | Self, or HR/Admin for another employee | 3–5 photos (multipart upload)                               |
| POST   | `/face/register-embeddings` | Self, or HR/Admin for another employee | 3–5 client-computed embeddings (JSON body, no image upload) |
| GET    | `/face/registration-status` | Self, or HR/Admin via `?employeeId=`   |                                                             |
| POST   | `/face/verify`              | Self                                   | Standalone test endpoint                                    |
| DELETE | `/face/:employeeId`         | Super Admin/HR                         | Hard delete (right-to-erasure)                              |

### Leave (`/leaves`, `/leave-types`, `/holidays`)

| Method   | Path                             | Access                                     | Notes                                                                                                                                                         |
| -------- | -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST     | `/leaves`                        | Self                                       | Overlap/balance/business-day checks before creation                                                                                                           |
| GET      | `/leaves/me?status=`             | Self                                       |                                                                                                                                                               |
| GET      | `/leaves/balance`                | Self                                       | Per leave-type, current year                                                                                                                                  |
| PATCH    | `/leaves/:id/cancel`             | Self                                       |                                                                                                                                                               |
| GET      | `/leaves`                        | Super Admin/HR/Manager                     | Review queue, team-scoped for Manager; each row includes `employee` name/code and `leaveTypeName` (batch-resolved, not per-row)                               |
| PATCH    | `/leaves/:id/approve`, `/reject` | Super Admin/HR/Manager                     |                                                                                                                                                               |
| GET/POST | `/leave-types`                   | Read: authenticated. Write: Super Admin/HR |                                                                                                                                                               |
| GET/POST | `/holidays?year=`                | Read: authenticated. Write: Super Admin/HR |                                                                                                                                                               |
| POST     | `/leaves/carry-forward`          | Super Admin/HR                             | Year-end rollover: `{fromYear?, toYear?}`, defaults to last year → this year — see [Known Simplifications & Future Work](#known-simplifications--future-work) |

### Shifts (`/shifts`)

| Method       | Path                  | Access         | Notes                               |
| ------------ | --------------------- | -------------- | ----------------------------------- |
| GET/POST     | `/shifts`             | Super Admin/HR | Shift definitions                   |
| PATCH/DELETE | `/shifts/:id`         | Super Admin/HR | Update / deactivate                 |
| POST         | `/shifts/assign`      | Super Admin/HR | Single employee                     |
| POST         | `/shifts/assign/bulk` | Super Admin/HR | Per-employee success/failure report |
| GET          | `/shifts/me`          | Self           | Current effective shift             |

### Payroll (`/salaries`, `/payroll`, `/payslips`)

| Method   | Path                          | Access                                             | Notes                                                                                       |
| -------- | ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET/POST | `/salaries`                   | Super Admin/HR                                     | Base salary structure. List rows include `employee` name/code (batch-resolved, not per-row) |
| PATCH    | `/salaries/:employeeId`       | Super Admin/HR                                     | Allowances/deductions merged, not replaced                                                  |
| POST     | `/payroll/run`                | Super Admin/HR                                     | `{month, departmentId?}` → `{runId}`                                                        |
| GET      | `/payroll/runs/:runId/status` | Super Admin/HR                                     | Poll batch progress                                                                         |
| GET      | `/payslips`                   | Super Admin/HR                                     | Filterable list; rows include `employee` name/code (batch-resolved, not per-row)            |
| GET      | `/payslips/me?month=`         | Self                                               | Released payslips only                                                                      |
| GET      | `/payslips/:id/pdf`           | Self (own, released) / Super Admin/HR (any status) |                                                                                             |
| PATCH    | `/payslips/:id/release`       | Super Admin/HR                                     | `generated` → `released`                                                                    |

### Notifications (`/notifications`)

| Method | Path                                   | Access         | Notes                          |
| ------ | -------------------------------------- | -------------- | ------------------------------ |
| GET    | `/notifications/me?unread=`            | Self           | Own + broadcasts               |
| PATCH  | `/notifications/:id/read`, `/read-all` | Self           |                                |
| POST   | `/notifications/broadcast`             | Super Admin/HR | Company-wide or per-department |
| POST   | `/notifications/device-token`          | Self           | Registers an FCM token         |

### Analytics (`/analytics`)

| Method | Path                                   | Access                 | Notes                                                                                                                                |
| ------ | -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/analytics/dashboard`                 | Super Admin/HR/Manager | Headcount + attendance/late/leave rate for one day; team-scoped for Manager, optional `departmentId` for HR/Admin                    |
| GET    | `/analytics/attendance-trend`          | Super Admin/HR/Manager | Attendance/late rate per month, trailing `months` (1–24, default 6), against real business-day counts                                |
| GET    | `/analytics/department-comparison`     | Super Admin/HR         | Headcount + rates for every active department, one day                                                                               |
| GET    | `/analytics/export/csv`, `/export/pdf` | Super Admin/HR         | Raw per-record attendance export for a `from`/`to` date range, optional `departmentId` — same query, two renderings                  |
| GET    | `/analytics/ai/late-risk`              | Super Admin/HR/Manager | Employees ranked by a real late-arrival-rate + trend score, trailing `days` (7–180, default 30); team-scoped for Manager             |
| GET    | `/analytics/ai/absenteeism-trend`      | Super Admin/HR/Manager | Monthly unexplained-absence rate, trailing `months` (3–24, default 6), plus a one-month linear-regression forecast                   |
| GET    | `/analytics/ai/anomalies`              | Super Admin/HR         | Rule-based sweep over `days` (1–90, default 30): implausible GPS travel, similar face embeddings across employees, overtime outliers |

### Audit (`/audit-logs`)

| Method | Path          | Access      | Notes                                                                                               |
| ------ | ------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/audit-logs` | Super Admin | `?entityType=&entityId=&actorId=&from=&to=&page=&limit=` — every filter optional, combined with AND |

## Build & Scripts

| Command                           | Purpose                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Hot-reload dev server (`tsx watch`)                                                               |
| `npm run build`                   | Type-check and compile to `dist/`                                                                 |
| `npm start`                       | Run the compiled build (`dist/server.js`)                                                         |
| `npm run lint` / `lint:fix`       | ESLint                                                                                            |
| `npm run format` / `format:check` | Prettier                                                                                          |
| `npm run typecheck`               | `tsc --noEmit`                                                                                    |
| `npm test` / `test:watch`         | Jest + Supertest                                                                                  |
| `npm run perf:smoke`              | Sequential latency check against a running instance (see [Performance Notes](#performance-notes)) |

## Testing

588 Jest tests across every module, none requiring a live database:

- **`*.service.test.ts`** — business logic and RBAC scoping, with every Mongoose model mocked (`tests/utils/mockQuery.ts` simulates a chainable, thenable Mongoose `Query`).
- **`*.routes.test.ts`** — the real Express middleware chain (`authenticate` → `requireRole` → `validate`) via Supertest, covering everything that should reject _before_ touching the database (401/403/422).
- **`tests/models/*.test.ts`** — schema validation via Mongoose's in-process `validateSync()`.
- **`tests/shared/*.test.ts`** — pure-function coverage for cross-cutting utilities (business-day math, shift-duration math, vector similarity, team scoping, actor helpers, the atomic sequence counter, regex-escaping).
- **`tests/middlewares/*.test.ts`** (Phase 18) — the central `errorHandler` exercised directly against every error shape it normalizes (`AppError`, Zod, Mongoose validation/cast errors, Multer, Mongo duplicate-key, a bare thrown string), including a separate file for its production-vs-development redaction branch (`isProduction` is computed once at module load, so it needs its own mocked module rather than a runtime toggle).

```bash
npm test
npm test -- --coverage   # writes an HTML+text report to coverage/
```

**Coverage** (`--coverage`, this run): 87% statements, 73% branches, 72% functions, 88% lines. The gap is concentrated in one place on purpose, not an oversight: every `*.controller.ts` is 40–75% because a controller is intentionally "parse → call service → respond" with no branching logic of its own (see [Architecture](#architecture)) — its real behavior is what `*.service.test.ts` already covers, and its rejection paths (401/403/422) are what `*.routes.test.ts` already covers; testing a controller's success path directly would mean re-implementing a live-database integration test this suite deliberately avoids, for a file with nothing left to catch. The same reasoning applies to thin infrastructure wrappers (`cloudinary.ts`, `fileUpload.service.ts`, `database.ts`) — mocked out entirely by whatever calls them, on purpose, so a Cloudinary outage in this test suite is impossible by construction.

## Deployment

Target topology (Render/Vercel/Atlas) is documented in [`docs/architecture/09-deployment-architecture.md`](../docs/architecture/09-deployment-architecture.md). A `Dockerfile` and `docker-compose.yml` are provided for local/API+DB parity.

**CI** (Phase 19): [`.github/workflows/ci-backend.yml`](../.github/workflows/ci-backend.yml) runs lint/`format:check`/typecheck/`test`/build plus a Docker image build on every push or PR touching this directory — real checks, no live database (see [Testing](#testing)). **Deploy** (`.github/workflows/deploy.yml`) is written but inert by default: this environment has no Render account to create a real deploy hook against, so the workflow no-ops until a human sets the `DEPLOY_ENABLED` repo variable and the hook-URL secret — see that file's header comment for the exact steps. See the [repository root's CI/CD section](../README.md#cicd) for all four workflows together.

## Security Considerations

- **Password storage**: bcrypt, cost factor 12, never returned by any query (`select: false` at the schema level).
- **Tokens**: short-lived access JWT (15 min) + rotating refresh JWT (7 d); only the refresh token's SHA-256 hash is persisted; reuse of an already-rotated refresh token is detected and rejected.
- **RBAC**: enforced at the route (`requireRole`) for whole-role gates and inside the service for per-resource scoping — a Manager's queries are always intersected with their own team server-side, never trusted from a client-supplied filter.
- **Rate limiting**: global limiter on all routes, a stricter one on `/auth/login` and `/auth/forgot-password`.
- **Account lockout** (Phase 16): 5 wrong passwords locks _that account_ for 15 minutes, independent of which IP the attempts came from — the per-IP rate limiter and this per-account lock are complementary, not redundant. Stored on the `User` document itself (`failedLoginAttempts`/`lockedUntil`) rather than the originally-planned Redis counter, since no phase has ever wired Redis into any code (see [Known Simplifications](#known-simplifications--future-work)). A documented trade-off: unlike `forgotPassword`'s identical-response design, a locked account _does_ reveal that the email exists — accepted because silently rejecting a correct password with no explanation is worse UX for negligible security gain against a targeted attacker.
- **Audit trail**: `GET /audit-logs` (Super Admin only) exposes the append-only `AuditLog` collection that attendance corrections already write to (`recordAudit`, since Phase 5) — filterable by entity, actor, and date range.
- **Transport hardening**: Helmet default headers, explicit CORS allowlist (`CORS_ALLOWED_ORIGINS`), `cookie-parser` with httpOnly refresh cookies.
- **Trust boundaries respected, not assumed**: QR tokens are signed with a secret independent of the session JWT secrets (a QR code is physically displayed and can be photographed); face-attendance liveness must be explicitly `true`, never merely present, since the server cannot re-derive liveness itself from a single embedding.
- **Biometric data**: face embeddings are the one entity in this codebase that is hard-deleted (not soft-deleted) on request, for genuine right-to-erasure.
- **Dependency audit** (`npm audit`): one moderate finding, upstream and currently unfixable without a regression — `exceljs@4.4.0` (already the latest release) pins a vulnerable `uuid@8.3.2` internally ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), a missing buffer bounds check in uuid's v3/v5/v6 generation when a buffer is explicitly passed in). This app never calls `uuid` directly and doesn't control how `exceljs` uses it internally, so there's no reachable path from any request this API accepts — documented here rather than silently ignored, and worth re-checking whenever `exceljs` ships a new release.

## Performance Notes

- **Geospatial queries** use a single indexed `$geoNear` aggregation against Geofence's `2dsphere` index — not an application-level distance loop over every branch.
- **`employeeCode` generation** uses the standard MongoDB atomic-counter pattern (`findByIdAndUpdate` + `$inc`), safe under concurrent creates without a count-then-use race.
- **Pagination everywhere** a list can grow unbounded (employees, attendance, leaves, payslips, salaries); exports are hard-capped at 5,000 rows rather than streaming unbounded result sets. `/analytics/export/csv` was missing this cap entirely until Phase 17 caught it — a wide `from`/`to` range on a large org could otherwise have pulled the whole `Attendance` collection into one request.
- **Compound/unique indexes** back the hot query paths — notably `{employeeId, date}` on Attendance and `{employeeId, month}` on Payslip — see [`docs/architecture/03-database-schema.md`](../docs/architecture/03-database-schema.md). Phase 17 added two more, `{method, date}` and `{date, overtimeMinutes}`, once Phase 15's AI anomaly sweep introduced the first queries that actually need them.
- **In-process response caching** (Phase 17): `analytics.service.ts`'s `getDashboardKpis` and `getDepartmentComparison` — the two reads a live dashboard polls most — are cached for 30s via `shared/cache/memoryCache.ts`, keyed by caller scope (a Manager's own team never shares a cache entry with another Manager's) so two different callers never see each other's data. A documented, accepted staleness window: a change landing seconds ago may not show up until the entry naturally expires. Same "real behavior, no new infrastructure" trade-off as Phase 11's job tracker and Phase 16's account lockout — the architecture doc's original plan named a shared Redis cache, but no phase has ever wired Redis into any code, so this is process-local (correct on one instance; behind a load balancer with more than one, each instance just caches independently, never incorrectly).
- **Load-test tooling**: `npm run perf:smoke` (`scripts/perf-smoke.ts`) is a small, dependency-free, genuinely-runnable latency check against a running instance — not a throughput/concurrency benchmark (that needs a real tool like k6 or autocannon against a staging environment, which this repository doesn't run in CI).
- **Connection pool** is explicitly configured (`MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE`, defaults 20/2 — see `config/database.ts`) rather than left at the Mongoose driver's defaults (100/0). Honest caveat: the actual throughput effect of this is unverified — this environment has no live MongoDB instance to run a concurrent-connection load test against, so this is a documented config change, not a measured tuning result.
- **Not yet done**: a real concurrent-load benchmark run is still open — `perf:smoke` measures sequential latency, not throughput under load, and running one for real needs a tool like k6/autocannon against a staging environment this repository doesn't have.

## Known Simplifications & Future Work

Two external-service integrations are intentionally-labeled placeholders — the code paths around them are fully real and tested, only the actual external call is stubbed, because this environment has no credentials to call the real service with:

| Seam                          | Where                                        | What's real                                                                                                                | What's stubbed                                                                                                                                                      |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Face embedding generation     | `face-recognition/faceEmbedding.provider.ts` | Registration flow (`POST /face/register`), cosine-similarity matching, liveness gating, confidence thresholding            | The photo→vector step itself (needs a real FaceNet/MobileFaceNet model — no GPU/model runtime here); deterministically hashes image bytes instead                   |
| Push notification delivery    | `notifications/push.service.ts`              | Notification persistence, read state, triggers wired into leave/payroll/shift/attendance events, device-token registration | The actual Firebase Cloud Messaging network call (no Firebase project/credentials here); logs what would be sent                                                    |
| Payroll batch job queue       | `payroll/payrollRun.service.ts`              | The payroll computation itself, run status tallying, per-employee failure isolation                                        | Job durability across a process restart — an in-memory map stands in for BullMQ/Redis, which is provisioned in `docker-compose.yml` but not wired into any code yet |
| Password-reset email delivery | `notifications/email.service.ts`             | Token generation, hashing, expiry                                                                                          | The actual SMTP send — logs the reset link when no `SMTP_HOST` is configured                                                                                        |

**`POST /face/register-embeddings` exists to close a real mismatch, not to duplicate `/register`.** The mobile app's face check-in ([`mobile-app/README.md`](../mobile-app/README.md#face-check-in)) computes its own embeddings on-device from ML Kit face-landmark geometry — a 67-number vector, structurally unrelated to `faceEmbedding.provider.ts`'s image-byte hash. An employee registered via the original `/register` (photo upload → server-side hash) can never cosine-match a check-in embedding computed by the phone, no matter how genuine the liveness check is. `/face/register-embeddings` accepts the phone's own embeddings directly at registration time so both ends of a given employee's face data are generated the same way. This closes the mismatch **only where both sides are actually used**: the mobile app has no registration screen calling this endpoint yet (still on the roadmap — see the mobile-app README's Known Limitations), so today it's reachable but only exercised by tests and any other API client.

**"AI-Assisted Analytics" (Phase 15) is real math, honestly named — not a stub, but also not a trained model.** `/analytics/ai/late-risk`, `/analytics/ai/absenteeism-trend`, and `/analytics/ai/anomalies` are transparent, reconstructible statistics: late-risk is a rate plus a first-half-vs-second-half trend nudge; the absenteeism forecast is a stated least-squares line (`method: "linear-regression"` is in the response itself, not marketing copy); anomaly detection is three independent rule-based checks (haversine-distance implied travel speed, leave-one-out z-scores on overtime totals, pairwise cosine similarity on face embeddings). No neural network, no training data, and the response never claims otherwise. The one caveat worth repeating: `duplicate_face` inherits Phase 8's documented placeholder — the embeddings it compares are hashed image bytes, not real facial features, so a flagged pair means "similar-looking source photos," not confirmed shared identity; every `duplicate_face` anomaly says so in its own `detail` field.

**Offline sync is a different kind of gap — not a stub, a missing counterpart.** `POST /attendance/sync` (see [API Reference](#api-reference)) is the real, fully-tested backend half of the flow in [`docs/architecture/08-sequence-diagrams.md#5-offline-attendance-sync`](../docs/architecture/08-sequence-diagrams.md): idempotent via `clientGeneratedId`, re-runs the same GPS/QR/face/shift checks a live check-in would against the punch's original `occurredAt`, and never silently drops a conflicting punch (surfaced as `status: "conflict"` with the reason code, and audit-logged). What doesn't exist in this repository is the _mobile_ half — the Hive local queue, connectivity listener, and retry logic are Flutter code, and this environment has no Flutter SDK to build or verify it against. The API contract is ready for it; the client isn't built yet.

Other known, documented gaps:

- **No DB transactions**: employee creation (User + Employee) and a few other multi-document writes are sequential, not transactional — acceptable on a single-node MongoDB (not a replica set) for now, revisited once running against Atlas.
- **Only one `clientGeneratedId` is retained per attendance record**: the schema (by design, from Phase 0) stores a single idempotency key per document, not one per punch. A check-out punch's sync call overwrites the field a check-in punch's sync call set. In practice this is safe — the mobile client deletes a punch from its local queue the moment it gets back `applied`/`duplicate`, so an older punch is never resubmitted after a newer one has already landed — but it's a narrow theoretical gap worth naming rather than silently assuming away. **Deliberately left unfixed for now**: the real fix (one idempotency key per punch type, not one per document) touches `attendance.service.ts`'s sync/check-in/check-out paths in several places at once, in code this project has no live MongoDB to verify a schema change against — safer to leave a documented, already-mitigated gap alone than risk a subtle regression in well-tested idempotency logic nobody can currently re-verify end-to-end.

Two gaps this section used to list — **leave carry-forward** and **absence detection** — are now real, not just documented as missing:

- `POST /leaves/carry-forward` (`leaveCarryForward.service.ts`) computes each active employee's unused balance for every `LeaveType` with `carryForward: true`, capped at `maxCarryForwardDays`, and writes it into next year's `LeaveBalance.carriedForward`. Idempotent (`$set`, not `$inc` — re-running the same year pair always recomputes the same number) and correctly covers employees who never took any leave that year (the ones with the most to carry forward, and previously the easiest case to silently miss since they have no persisted `LeaveBalance` row to begin with).
- `POST /attendance/absence-sweep` (`absenceDetection.service.ts`) marks every active employee with no Attendance record for a date `absent`, skipping weekends/holidays via the same business-day math leave balances already use. Race-safe against a real concurrent check-in (`$setOnInsert` + `upsert`, same pattern `markAttendanceOnLeave` already established).

Neither runs on an actual schedule (no cron/worker infrastructure exists in this codebase, same reasoning as the payroll batch job below) — both are HR/Admin-triggerable actions, the same shape as `POST /payroll/run`. A real deployment would put one or both behind `node-cron` or an external scheduler; that wiring itself is a few lines once a real deployment target exists to run it on, but isn't something this environment can verify by actually waiting a day/year for it to fire on its own.

Remaining platform-level phases (a mobile offline-sync client, CI/CD, and consolidated docs) are tracked at the [repository root](../README.md).

## License

Proprietary — internal enterprise project.
