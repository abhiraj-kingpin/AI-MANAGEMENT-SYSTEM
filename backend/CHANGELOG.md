# Changelog

All notable backend development history, in build order. The [README](README.md) describes the system as it stands today; this file explains how it got there — including every deliberate simplification, every bug a test caught before it shipped, and the reasoning behind each.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Test counts are cumulative (`npm test`, no live MongoDB required for any of them).

## [Phase 18] — Expanded Test Coverage

**Added** — `tests/shared/regex.test.ts`, `tests/shared/counter.test.ts`, `tests/modules/notifications/email.service.test.ts`, and `tests/middlewares/error.middleware.test.ts` + `.production.test.ts`.

- Ran `npm test -- --coverage` first to find genuine gaps rather than guessing: `escapeRegExp` (a security-relevant helper — the one thing standing between user search text and `new RegExp()`), `nextSequence` (the atomic-counter pattern the Performance Notes already call out as important), `email.service.ts` (a documented placeholder that had never been tested _directly_, only mocked away by its callers), and `errorHandler` (the single piece of code every unhandled failure in the whole API funnels through) all had 0% function coverage before this phase. All four are now at 100%.
- `errorHandler`'s production-vs-development redaction branch needed its own test file, not just another `it()`: `isProduction` is computed once at module load from `env.NODE_ENV`, so exercising the production path requires a file-scoped `jest.mock('../../src/config/env', ...)`, hoisted before any import — the exact same reason Phase 14/15/16/17's various env-dependent tests (`push.service.test.ts`, etc.) already isolate themselves into their own files.
- **Deliberately not chased to 100%**: every `*.controller.ts` (40–75%, thin "parse → call service → respond" glue with no branching logic — its behavior is what `*.service.test.ts` covers, its rejection paths are what `*.routes.test.ts` covers) and infrastructure wrappers like `cloudinary.ts`/`fileUpload.service.ts`/`database.ts` (mocked out entirely by every caller, on purpose). Chasing these to 100% would mean either standing up a live-database integration layer this suite has deliberately avoided since Phase 0, or adding tests that re-assert "the mock returns what I told it to" — motion, not coverage that catches anything.
- **Verified**: 536 Jest tests (up from 512 — 24 new). Overall coverage: 87% statements / 73% branches / 72% functions / 88% lines (up from 85.6%/69.6%/70.2%/86.5%), documented in full in [README's Testing section](README.md#testing) rather than just asserted.

## [Phase 17] — Performance

**Added** — `shared/cache/memoryCache.ts` (a tiny in-process TTL cache, applied to `analytics.service.ts`'s two most-polled reads), two new `Attendance` indexes for Phase 15's query patterns, and `scripts/perf-smoke.ts` (`npm run perf:smoke`), a small dependency-free latency check.

- **Caching**: `getDashboardKpis` and `getDepartmentComparison` are now cached for 30s, keyed by caller scope — a Manager's own team never shares an entry with another Manager's, and RBAC (the `FORBIDDEN` throw for an `employee` actor) is re-checked on every call since a rejected promise is never cached. Same documented trade-off as Phase 11's in-memory job tracker and Phase 16's account lockout: the architecture doc's plan was a shared Redis cache, no phase has ever wired Redis into any code, so this is process-local — correct on one instance, still correct (just a lower hit rate) behind more than one.
- **Real bug caught while reviewing this phase's own new Phase 15 query patterns**: `/analytics/export/csv` (Phase 14) had no row cap at all — every other export in this codebase (`attendance.service.ts`'s Excel/PDF, `.limit(5000)`) already had one. A wide `from`/`to` range on a large org could have pulled the entire `Attendance` collection into a single request. Fixed with the same `.limit(5000)` convention, caught by a dedicated test asserting the limit call.
- **Indexes**: added `{method, date}` and `{date, overtimeMinutes}` on `Attendance`, driven by real query patterns Phase 15's anomaly sweep introduced (a GPS-method date-range scan, and a date-range + overtime-floor scan) — not speculative, and the extra per-insert index-maintenance cost on a high-write collection is named plainly, not glossed over.
- **`npm run perf:smoke`**: sequential p50/p95 latency against a running instance for the reads most likely to be polled by a live dashboard. Deliberately not a concurrency/throughput benchmark (that needs a real tool like k6 or autocannon against staging) — evaluated adding `autocannon` as a devDependency, then removed it: it transitively pins the same vulnerable `uuid` this repo already has one documented finding for (via `hyperid`), and `npx autocannon` works identically without carrying that dependency permanently.
- **Verified**: 512 Jest tests (up from 499 — 13 new: 8 in `memoryCache.test.ts`, plus 5 in `analytics.service.test.ts` — 4 caching-behavior cases and the export-cap regression test).

## [Phase 16] — Security Hardening

**Added** — Account lockout on `POST /auth/login`, and `GET /audit-logs` (Super Admin only) exposing the audit trail attendance corrections have written to since Phase 5.

- **Account lockout**: 5 wrong passwords locks the account for 15 minutes, tracked on `User.failedLoginAttempts`/`User.lockedUntil` rather than the Redis counter `auth.service.ts`'s old comment named as the plan — no phase has ever wired Redis into any code (same documented gap as Phase 11's job queue), so this reuses the pattern already established there: same guarantee, no new infrastructure dependency. An already-expired lock is treated as fully reset on the next failure (starts counting from 1), not resumed from its pre-expiry count.
- **Documented trade-off**: `forgotPassword` deliberately gives an identical response whether or not an email exists; account lockout can't offer that same guarantee — a locked response necessarily confirms the email is registered. Accepted because silently rejecting a _correct_ password during lockout with no explanation is worse UX for negligible security benefit against an attacker who already has the target email.
- New `AppError.locked()` (423) — distinct from 401/403, since this is "the account exists and the password may well be right, but access is temporarily blocked," not a credentials or permissions failure.
- **Audit trail read API**: `audit.service.ts` already had `recordAudit` (write-only, fire-and-forget); added `listAuditLogs` plus a controller/routes layer to actually expose it, per the Phase 0 contract in [`docs/architecture/04-api-documentation.md`](../docs/architecture/04-api-documentation.md#audit-audit-logs--super-admin-only). Every filter (`entityType`, `entityId`, `actorId`, `from`/`to`) is optional and ANDs together.
- **`npm audit` reviewed and documented**, not silently ignored: one moderate finding (`uuid@8.3.2`, pinned internally by `exceljs@4.4.0` — already the latest release — with no reachable path from anything this API accepts). See [README's Security Considerations](README.md#security-considerations) for the full reasoning.
- Frontend: `admin-dashboard`'s `LoginPage` was hardcoding "Invalid email or password." for every login failure — harmless before this phase, actively misleading once a locked-out user could see it instead of a wrong-password message. Fixed to surface the backend's actual error message.
- **Verified**: 499 Jest tests (up from 482 — 17 new: 5 lockout cases in `auth.service.test.ts`, 6 in `audit.service.test.ts`, 6 in `audit.routes.test.ts`).

## [Phase 15] — AI-Assisted Analytics

**Added** — `modules/analytics/analytics.ai.*`: `GET /analytics/ai/late-risk`, `GET /analytics/ai/absenteeism-trend`, and `GET /analytics/ai/anomalies`, per the Phase 0 contract in [`docs/architecture/04-api-documentation.md`](../docs/architecture/04-api-documentation.md#analytics-analytics).

- **Named honestly**: everything here is transparent, rule-based statistics — a rate, a trend nudge, a least-squares line, a z-score, a cosine similarity — not a trained model. Every response is fully reconstructible from the numbers it also returns (`late-risk` includes `lateDays`/`workingDays`/`trend` alongside the score; the forecast literally states `method: "linear-regression"`).
- **Late-risk** (`/ai/late-risk`): ranks the caller's in-scope employees by late-arrival rate over a trailing window (7–180 days, default 30), nudged ±10 points depending on whether the second half of the window is worse or better than the first. Team-scoped for a Manager, org-wide (optional `departmentId`) for Super Admin/HR — reuses `analytics.service.ts`'s `resolveEmployeeIds`, exported for this purpose.
- **Absenteeism trend** (`/ai/absenteeism-trend`): monthly unexplained-absence rate — defined as an expected working day with no attendance signal at all (present/late/half-day/on-leave), which correctly measures real absenteeism without depending on the schema's `absent` status that nothing currently writes (see Phase 11's documented gap) — plus a one-month-ahead forecast from a least-squares trend line over the history.
- **Anomalies** (`/ai/anomalies`, HR/Admin only): three independent rule-based checks run concurrently — `location_anomaly` (haversine distance between two consecutive GPS punches, divided by elapsed time; flags implied travel over 200 km/h), `duplicate_face` (pairwise cosine similarity ≥0.92 between two _different_ employees' face embeddings, reusing the same real `cosineSimilarity` math Phase 8 already tests), and `overtime_outlier` (a **leave-one-out** z-score on trailing-window overtime totals — see the real bug this caught, below).
- **Real bug caught while building this phase**: a self-inclusive z-score (each employee scored against the mean/stddev of the _whole_ group, including themselves) mathematically caps the highest possible z-score at `sqrt(n-1)` — a lone outlier drags the group's own mean/stddev up enough to partly hide itself. With small teams this silently made the outlier check nearly impossible to trigger (a 4-person sample can never exceed z≈1.73, below the z>2 threshold, no matter how extreme the outlier). Caught by a test asserting a deliberately extreme case _should_ have been flagged and wasn't. Fixed by scoring each employee against a "leave-one-out" baseline (mean/stddev of everyone _else_) instead — the standard fix for small-sample outlier detection.
- `duplicate_face` explicitly inherits Phase 8's documented placeholder in its own `detail` field: the embeddings it compares are hashed image bytes (no GPU/model runtime in this environment), so a flagged pair means "similar-looking source photos," not confirmed shared identity.
- New `shared/utils/geo.ts#haversineDistanceKm` — a plain great-circle-distance function for comparing two in-memory GPS points directly, distinct from `geofence.service.ts`'s `$geoNear` (which only works against an indexed collection).
- **Verified**: 482 Jest tests (up from 458 — 24 new, split across `analytics.ai.service.test.ts` (real statistics, hand-computed) and `analytics.routes.test.ts`'s new RBAC/validation cases).

## [Phase 14] — Reports & Analytics Dashboard

**Added** — `modules/analytics/`: `GET /analytics/dashboard` (headcount + attendance/late/leave rate for one day), `GET /analytics/attendance-trend` (attendance/late rate per month, trailing 1–24 months), `GET /analytics/department-comparison` (per-department comparison, HR/Admin only), and `GET /analytics/export/csv` (raw per-record attendance export, HR/Admin only) — paths match the Phase 0 contract in [`docs/architecture/04-api-documentation.md`](../docs/architecture/04-api-documentation.md#analytics-analytics), with `attendance-trend`'s window controlled by a `months` count (1–24) rather than the originally-sketched `period` enum, and `export/csv` scoped to attendance records specifically (a PDF export and other view-specific exports from that same doc row remain unbuilt).

- Every number is computed from real `Employee`/`Attendance` data — no synthetic or placeholder figures anywhere in this phase, continuing the project-wide rule that a pending feature says so explicitly instead of showing invented numbers (see the admin dashboard's Phase-14-pending stat cards it now replaces).
- Dashboard KPIs and the attendance trend are team-scoped for a Manager (their own direct reports only, via the same `resolveEmployeeIds`-style role branching `leave.service.ts#list` and `employee.service.ts#listEmployees` already use) and org-wide (optionally one department) for Super Admin/HR — the route only requires authentication; the role branching lives in the service, per this codebase's established route-vs-service RBAC split.
- The department comparison and CSV export are org-wide reports with no "my team" reading, so they're gated at the route (`requireRole('super_admin', 'hr')`) instead, matching how `payslip.routes.ts#list` is already gated.
- The attendance-trend rate's denominator is real expected working days (`shared/utils/businessDays.ts`, weekdays minus holidays) × headcount for that month — not calendar days — computed via a single `$dateToString`/`$cond`/`$sum` aggregation per request rather than one query per month.
- **DRY refactor done first**: extracted the `round2()` helper duplicated in `payslip.service.ts` to `shared/utils/math.ts`, and the holiday-date-range lookup duplicated inside `leave.service.ts` to a new exported `holiday.service.ts#getHolidayDatesInRange` — both now used by this phase's math too. All 103 pre-existing `leaves`/`payroll` tests pass unchanged against the refactor.
- **Verified**: 458 Jest tests (up from 433 — 25 new, split across `analytics.service.test.ts` (real aggregation math, hand-computed) and `analytics.routes.test.ts` (RBAC/validation)).

## [Phase 13] — Offline Mode (backend half)

**Added** — `POST /attendance/sync`: bulk-applies offline-queued check-in/check-out punches, per [`docs/architecture/08-sequence-diagrams.md#5-offline-attendance-sync`](../docs/architecture/08-sequence-diagrams.md).

- Refactored `attendance.service.ts#checkIn`/`checkOut` into time-parameterized internals (`performCheckIn`/`performCheckOut`) shared by both the live endpoints (`now = new Date()`) and sync (`now` = the punch's original `occurredAt`) — one implementation, not two copies that could drift. All 45 pre-existing `checkIn`/`checkOut` tests pass unchanged against the refactor, confirming behavior wasn't altered.
- Idempotent via `clientGeneratedId` (a field and sparse-unique index the schema already had, reserved since Phase 2) — resubmitting the same punch twice returns `status: "duplicate"`, never double-applies it.
- A punch that can't apply (already checked in, outside geofence, liveness failed, nothing to check out from, ...) never fails the whole batch or gets silently dropped — it comes back as `status: "conflict"` with the originating error code as `reason`, and is audit-logged for the anomaly-detection pass planned for Phase 15.
- Punches are applied sequentially, in the order submitted — a check-out can depend on a check-in earlier in the same batch.
- **Scope boundary, stated plainly**: this is the backend half of offline mode only. The mobile half — a Hive local queue, a connectivity listener, and retry/delete logic — is Flutter code that doesn't exist in this repository yet; this environment has no Flutter SDK to build or verify it. The API contract those pieces would call against is real and tested now.
- **Documented limitation found while designing this**: the fixed schema stores one `clientGeneratedId` per `Attendance` document, not one per punch — a check-out punch's sync call overwrites the value a check-in punch's sync call set for the same day. Not a practical problem (the mobile client deletes a punch from its queue the moment it's acknowledged, so an already-acknowledged punch is never resent), but worth naming rather than assuming away.
- **Verified**: 433 Jest tests (up from 421).

## [Phase 12] — Notifications

**Added** — `modules/notifications/`: an in-app notification feed (`GET /notifications/me`, `?unread=true`, mark-read / mark-all-read), HR/Admin broadcasts (`POST /notifications/broadcast`, company-wide or per-department), and FCM device-token registration (`POST /notifications/device-token`).

- Real triggers wired into the modules that need them: a leave application notifies the applicant's manager; an approval/rejection notifies the applicant; a released payslip notifies the employee; a new shift assignment notifies the employee; an attendance-correction decision notifies the requester.
- Push delivery itself (`push.service.ts#sendPushNotification`) is an honestly-labeled placeholder — no Firebase project or service-account credentials exist in this environment, so it logs what it would have sent rather than pretending to call Firebase. Every notification is still a real, persisted, individually-read-trackable document regardless of whether the push send is real.
- Department-scoped broadcasts fan out to one document per active employee (so read state is trackable per person); a company-wide broadcast is a single `recipientId: null` document per the fixed schema, with a documented consequence: its `isRead` flag is shared, not per-recipient, since the schema has no per-user read-tracking for that case.
- Added `User.deviceTokens: string[]` — not in the original schema doc, needed to back the device-token endpoint (same kind of documented gap-fill as attendance's `request-correction` in Phase 5).
- **Real bug caught while building this phase**: `z.coerce.boolean()` on a query parameter is `Boolean(str)`, which is `true` for _any_ non-empty string — including the literal text `"false"`. Found on the new `unread` filter, and the same bug already existed on Phase 10's `includeInactive` shift filter; both fixed with an explicit `z.enum(['true','false']).transform(...)`.
- **Verified**: 417 Jest tests (up from 385).

## [Phase 11] — Payroll

**Added** — `modules/payroll/`: base salary CRUD (`/salaries`), batch payslip generation (`POST /payroll/run`, poll via `GET /payroll/runs/:runId/status`), and payslip access (`/payslips`, `/payslips/me`, PDF download, release).

- The payroll math is real, computed from `Attendance` data: overtime pay from summed overtime minutes at 1.5× an hourly rate derived from base salary; an attendance penalty (the schema's `latePenalty` field) covering late arrivals, half-days, and absences, each weighted by how much of a day they cost. Net pay is floored at 0.
- A released payslip is never silently recomputed by a later run.
- The batch trigger is an honestly-labeled placeholder for one piece only — the job queue. The API doc calls it a "queued job" (BullMQ + Redis in production); Redis is provisioned in `docker-compose.yml` but not wired into any application code yet, so this phase uses an in-memory run tracker instead. Every payslip it writes is still a real, durably-saved document; only the progress readout is lost on a restart.
- PDF payslips are generated for real via PDFKit — verified in tests via the actual `%PDF` magic bytes.
- **Verified**: 385 Jest tests (up from 329).

## [Phase 10] — Shift Management

**Added** — `modules/shifts/`: shift definitions (morning/night/rotational/flexible), single and bulk employee assignment, and `GET /shifts/me`.

- Assignments are forward-only by design (`effectiveFrom` must be today or later) — there is always at most one open-ended assignment per employee, so reassigning just closes the previous one out the day before, with no arbitrary-interval reconciliation needed.
- `attendance.service.ts` now resolves each employee's real assigned shift for late/present at check-in and overtime/half-day thresholds at check-out, correctly handling night shifts that cross midnight — falling back to the old hardcoded defaults only for an employee nobody's assigned a shift to yet, which is what let every pre-existing attendance test keep passing unchanged.
- Half-day threshold now scales with the shift's real duration instead of a flat 4 hours.
- **Verified**: 329 Jest tests (up from 284).

## [Phase 9] — Leave Management

**Added** — `modules/leaves/`: apply/cancel/approve/reject, running balances, leave types, and a holiday calendar.

- `totalDays` is computed server-side from real business-day math (`shared/utils/businessDays.ts`), excluding weekends and holidays — never trusted from the client.
- Balances are lazy: no `LeaveBalance` document is written until a request is actually approved or reversed; before that, the balance is computed virtually from the leave type's default quota.
- Approving a leave stamps real `on_leave` Attendance records for each business day (via `$setOnInsert`, never overwriting a real check-in); check-in now rejects with `ON_APPROVED_LEAVE` on a day already stamped that way.
- The manager-scoping query attendance already had inline was extracted to a shared `getManagedEmployeeIds` helper instead of being copy-pasted a third time.
- **Flagged gap**: `LeaveType.carryForward`/`maxCarryForwardDays` are schema fields the balance math reads, but nothing automates the year-end carry-forward computation yet — that needs a scheduled job.
- **Verified**: 284 Jest tests (up from 218).

## [Phase 8] — Face Recognition

**Added** — `modules/face-recognition/`: registration, per-employee embedding storage, cosine-similarity verification wired into check-in as `method: 'face'`.

- **One seam is a labeled placeholder, confirmed with the user before building, not a silent one.** Converting a photo into an embedding vector needs a real face-recognition model (FaceNet/MobileFaceNet), which can't run in this backend-only environment (no GPU, no model bundling). `faceEmbedding.provider.ts` deterministically hashes image bytes into a unit vector instead — loudly documented as having no relationship to actual facial similarity, existing only so the pipeline around it is exercisable end-to-end. Swapping in a real model is a one-function change.
- Everything around that seam is real: attendance-time verification never touches an image (the mobile app computes the embedding on-device per the architecture); the backend runs real cosine-similarity math against stored embeddings, thresholded at `FACE_MATCH_THRESHOLD`. Liveness must be explicitly `true`, not merely present.
- `DELETE /face/:employeeId` is a genuine hard delete — the one place in this codebase that isn't soft-delete, since biometric data warrants real right-to-erasure.
- **Real bug caught while building**: the first draft of "deactivate old embeddings on re-registration" used a time cutoff, which could misfire mid-batch on a slow request; fixed to exclude by explicit id instead.
- **Verified**: 218 Jest tests (up from 180).

## [Phase 7] — QR Attendance

**Added** — `modules/qr/`: HR/Admin generate a time-boxed, HMAC-signed QR per branch; employees scan it via `POST /attendance/check-in` with `method: 'qr'`.

- Two independent checks close two different attack paths: the JWT's own signature + `exp` (fast-fails a forged/tampered token before any DB call), and the DB record's `validTo` (catches a token revoked before its original `exp` — the JWT alone can't see that).
- Uses its own signing secret (`QR_TOKEN_SECRET`), separate from session JWTs, since a QR code is a different trust boundary (displayed on a screen, potentially photographed).
- **Real bug the tests caught**: the "already checked in today" guard originally ran _after_ method-specific work — harmless for GPS, but QR's `validateAndConsumeQrToken` mutates the QR record as a side effect, so a doomed request would have silently burned a single-use code. Fixed by reordering the guard first.
- **Verified**: 180 Jest tests (up from 155).

## [Phase 6] — GPS Attendance

**Added** — `modules/geofence/`: office-location CRUD plus `findNearestGeofence()`, wired into check-in as `method: 'gps'`.

- A single `$geoNear` aggregation against the `2dsphere` index does the distance math and sorts nearest-first server-side — not an app-level haversine loop.
- `DELETE /geofences/:id` deactivates rather than hard-deletes, since historical attendance records reference a geofence by id.
- `manual` check-in tightened back to HR/Admin-only now that GPS is a standard employee path.
- **Verified**: 155 Jest tests (up from 137).

## [Phase 5] — Attendance

**Added** — `modules/attendance/`: self-service check-in/out + breaks, HR/Manager reporting, Excel/PDF export, and a two-track correction workflow (direct HR edit, and employee-request → manager/HR-approve).

- Late/overtime/half-day math ran against one hardcoded default shift this phase (09:00, 8h day) — replaced with real per-employee shift lookups in Phase 10.
- Only `method: 'manual'` was implemented; `gps`/`qr`/`face` were accepted by the Phase 2 schema but explicitly rejected with `METHOD_NOT_AVAILABLE` rather than silently no-op'ing.
- Both correction paths are audit-logged through a new fire-and-forget `audit.service.ts` — a failed audit write logs loudly but never fails the request it's describing.
- **Verified**: 137 Jest tests (up from 98).

## [Phase 4] — Employee Management

**Added** — `modules/employees/`: full CRUD, profile image + document upload (Multer memory storage → Cloudinary, no local disk).

- RBAC split deliberately: whole-role gates (list/search/create/delete) live at the route via `requireRole`; per-resource scoping (a Manager sees only their team; an employee can self-edit only `phone`/`address`/`emergencyContact`) lives in the service layer.
- `employeeCode` generation uses the standard MongoDB atomic-counter pattern, safe under concurrent creates.
- Employee creation is two sequential writes (User, then Employee), not a transaction — a documented v1 trade-off, not a hidden one.
- **Verified**: 98 Jest tests (up from 66).

## [Phase 3] — Authentication

**Added** — `modules/auth/`: register, login, JWT access + rotating refresh tokens, reuse-detection, logout, forgot/reset password, change password, `GET /me`.

- **Real bug caught by tests**: two refresh tokens signed for the same user within the same second were byte-identical (JWT `iat`/`exp` have second granularity). Fixed by adding a random `jti` to every signed token.
- The `User` schema tracks one active refresh-token hash per user (single session) — logging in on a new device ends the old session. Multi-device sessions would need a `sessions` sub-collection; a documented v2 item.
- **Verified**: 66 Jest tests (up from 31).

## [Phase 2] — Database Design

**Added** — every collection from the architecture doc as a Mongoose model, with relationships, indexes (including the unique `{employeeId,date}` compound index and Geofence's `2dsphere` index), and schema-level cross-field validation.

- **Verified**: 31 Jest tests exercising validators directly via Mongoose's in-process `validate()`/`validateSync()`.

## [Phase 1] — Project Setup

**Added** — Express + TypeScript scaffold, env validation (Zod), MongoDB connection, Winston/Morgan logging, centralized error handler, health checks, Helmet/CORS/rate-limiting, ESLint + Prettier, Docker + docker-compose (API/Mongo/Redis), Jest + Supertest.

## [Phase 0] — Architecture

Full system design: architecture, ER diagram, database schema, API contract, tech stack rationale, auth flow, sequence diagrams, deployment topology — see [docs/architecture/](../docs/architecture/). No code.
