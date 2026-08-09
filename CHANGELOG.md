# Changelog

Repository-wide build history, in order. Backend module-level detail (what was added, what bugs were caught, what was deliberately simplified and why) lives in [backend/CHANGELOG.md](backend/CHANGELOG.md) — this file covers cross-project milestones and links to that detail rather than duplicating it.

## Mobile App — Face Check-In

Sixth feature beyond auth. `CameraService` (wraps `camera`) and `FaceDetectionService` (wraps `google_mlkit_face_detection`) are the only two places those plugins are touched — everything else in `features/face/` works against this app's own `DetectedFace` type. Liveness is real: `FaceCheckInController` captures a short burst of frames while the user blinks, and `BlinkLivenessChecker` — pure, unit-tested logic — requires a genuine open→closed→open transition, which a printed photo or frozen frame can never produce. The embedding step is honestly not real: bundling/verifying a trained FaceNet/MobileFaceNet `.tflite` model wasn't feasible in this environment (no GPU, no way to download/validate a model file) — the same constraint the backend's own `faceEmbedding.provider.ts` already documents for server-side registration. `GeometricEmbeddingGenerator` produces a deterministic 67-number vector from the detected face's actual landmark geometry instead — a real function of a real detected face, but not something that reliably matches the same person the way a trained model would. `AttendanceRepository.checkInWithFace()` mirrors `checkInWithGps()` exactly, including offline-queue fallback. Face *registration* isn't built on either client yet, and the two embedding methods (server byte-hash vs. mobile geometry) wouldn't currently agree even if it were — documented as a known limitation, not silently glossed over. `flutter test`: 35/35 passing (up from 20).

## Mobile App — Offline Sync (Attendance Queue)

Fifth feature beyond auth, completing Phase 13's mobile half (the backend side, `POST /attendance/sync`, has existed since the backend's own Phase 13). `AttendanceRepositoryImpl` catches a `NetworkException` specifically on check-in and enqueues the punch into a Hive-backed `OfflineQueueService` (plain `Map` storage, no generated `TypeAdapter` — this project has no `build_runner` step) rather than failing outright, returning a new `OfflineQueuedFailure` type the UI shows as neutral "queued" text instead of a red error. `ConnectivityService` (wrapping `connectivity_plus`) emits only on real offline→online transitions; `SyncService` drains the whole queue against `POST /attendance/sync` in one batch on each transition, removing every terminal result (applied, duplicate, or a definitive conflict) the same way the backend's own sync endpoint treats them. Check-in only for now, not check-out — a natural, documented follow-up rather than a fundamental limit. `flutter test`: 20/20 passing (up from 16). With this, the mobile app is feature-complete against its scope of the original 20-phase roadmap; only QR/Face check-in and Shifts (a screen, not a roadmap phase gap) remain.

## Mobile App — Notifications (Inbox)

Fourth feature beyond auth: an inbox (`GET /notifications/me`, unread filter, mark-read/mark-all-read). Self-service only — sending a broadcast is Super Admin/HR only and already built on the admin dashboard, so this app doesn't duplicate that composer. Fetches a single generous page (`limit: 50`) rather than building full pagination UI, a documented scope cut. `flutter test`: 16/16 passing (up from 14).

## Mobile App — Payslips (List + Download)

Third feature beyond auth: lists released payslips (`GET /payslips/me`) and downloads the real PDF (`GET /payslips/:id/pdf`, the one binary response in the whole API) to the device's app-documents directory via `path_provider` — checked its `android/build.gradle` first to confirm it hardcodes `compileSdk` directly rather than referencing the same `flutter.compileSdkVersion` pattern that broke `geolocator`. Doesn't open the saved PDF in a viewer yet (needs another plugin this pass didn't add) — reports the saved path via a `SnackBar` instead, real working behavior rather than a half-built "open" action. `flutter test`: 14/14 passing (up from 11).

## Mobile App — Leave (Apply/Cancel/Balance)

Second feature beyond auth, same shape as Attendance: data/domain/presentation, a `Result<T>`-returning `LeaveRepository`, one controller loading leave types + balance + history concurrently. The apply form is a modal bottom sheet rather than a separate route. `LeaveEntity.isCancellable` mirrors `leave.service.ts#cancel`'s exact server-side rule, so the Cancel button only appears where the server would actually allow it. `flutter test`: 11/11 passing (up from 8).

## Mobile App — GPS Check-In/Check-Out

The first feature added to the mobile app beyond auth: a `LocationService` wrapping `geolocator` (permission request + high-accuracy GPS read), composed with `POST /attendance/check-in`/`check-out` behind the same Clean Architecture layering the auth slice established (data/domain/presentation, a `Result<T>`-returning repository, Riverpod DI). The screen shows today's status, a single button that swaps between Check In and Check Out, and a pull-to-refresh history list. Also extracted `dio_exception_mapper.dart` out of `AuthRemoteDataSourceImpl` (which had it inlined) once Attendance needed the identical `DioException` → domain-`Exception` translation — the same "fix it once you've copied it twice" call made for the backend's `resolveEmployeeRefs`.

Adding `geolocator` broke `ci-mobile.yml`'s debug APK build — a real failure, and one GitHub's log API wouldn't let us read directly (a 403 this environment's unauthenticated requests can't get past), so it was root-caused by reproducing it with a local `flutter build apk --debug` instead. Two genuine, separate bugs: (1) `minSdkVersion` below 26 needs core library desugaring enabled, geolocator's own documented requirement; (2) `geolocator_android`'s `build.gradle` reads a `flutter.compileSdkVersion` property that only exists on Flutter's older, no-longer-used Gradle plugin-loading mechanism — fixed with a small compatibility shim in the root `android/build.gradle`. Also pinned `geolocator` below `14.0.0`, since `geolocator_android` 5.x's Dart code needs a newer Flutter SDK than this project's pinned 3.24.0. `flutter analyze`: 0 issues; `flutter test`: 8/8 passing (up from 4). QR/Face check-in still need their own camera/ML plugins and aren't built yet.

## Admin Dashboard — Analytics Charts (Feature-Complete)

`DashboardPage`'s last placeholder: a 6-month attendance-trend line chart (`GET /analytics/attendance-trend`, Super Admin/HR/Manager) and a department-comparison ranking (`GET /analytics/department-comparison`, Super Admin/HR only). Both hand-rolled in SVG/CSS rather than a charting library, matching the no-dependency approach the sparkline component already used. With this, the admin dashboard is feature-complete against the original 20-phase roadmap.

## Admin Dashboard — Geofences & QR Codes Features

The last two Super-Admin/HR-only configuration screens: Geofences (office-location CRUD — branch name, lat/lng, radius) and QR Codes (per-location generate/revoke, rendering the real scannable image the backend already produces). Neither has a self-service half — an employee checks in *against* these via the mobile app, they never manage one — so both nav items are hidden from every other role rather than showing a page with nothing in it. With these two, every module from the original roadmap is a real screen; only the analytics trend-chart/department-comparison panel remains.

## Admin Dashboard — Notifications Feature

An inbox every role sees (unread filter, mark-read/mark-all-read) plus a Topbar bell badge polling the unread count every 30s, since there's no push/websocket channel to invalidate it on arrival. Super Admin/HR additionally get a "Send Broadcast" action, org-wide or scoped to one department.

## Admin Dashboard — Payroll Feature

Same shape as Leave and Shifts: a "My Payslips" section (list + PDF download) every role sees, above a Super Admin/HR-only area for salary structures and the payslip queue (filter, release, download) plus a "Run Payroll" action that starts a batch job and polls its status until it finishes. The PDF download is the one binary response in the whole API, fetched as a blob rather than JSON. Building this screen surfaced the real backend gap fixed in `v1.1.3` below.

## Backend v1.1.3 — Salary & Payslip Lists: Real Employee Names

The same class of gap as `v1.1.1`/`v1.1.2`, found this time while reading the Payroll module ahead of its admin-dashboard screen: `GET /salaries` and `GET /payslips` both had bare `employeeId`s, no names. Fixed with the same batch-lookup pattern — and, since this made three near-identical copies of that pattern, extracted it into a shared `resolveEmployeeRefs()` and switched Attendance's and Leave's existing code over to it too, rather than writing a fourth and fifth copy. 562 backend tests. Details: [backend/CHANGELOG.md#v113--salary--payslip-lists-real-employee-names-shared-resolveemployeerefs](backend/CHANGELOG.md#v113--salary--payslip-lists-real-employee-names-shared-resolveemployeerefs).

## Admin Dashboard — Shifts Feature

Same shape as Leave: a "My Shift" card every role sees, above a Super Admin/HR-only section for shift definitions (create/edit/deactivate) and single-employee assignment (reusing the `EmployeePicker` typeahead built for Employees). `POST /shifts/assign/bulk` exists on the API but isn't wired up in the UI yet — a documented scope cut, not an oversight.

## Admin Dashboard — Leave Feature

The one screen every role reaches, not just Super Admin/HR/Manager: self-service balance cards, apply/cancel, and request history sit above a Super Admin/HR/Manager-only review queue rendered in the same page, gated by role rather than a separate route (a plain `employee` gets the self-service section only; the Sidebar link itself isn't role-hidden the way Employees/Attendance are). Building this screen is what surfaced the real backend gap fixed in `v1.1.2` below.

## Admin Dashboard — Attendance Feature

The HR/Manager attendance report: date-range/department/status filters, pagination, direct corrections (Super Admin/HR, mandatory reason), and approve/reject on employee-initiated correction requests (Super Admin/HR/Manager). New shared `Modal` component. Building this screen is what surfaced the two real backend gaps fixed in `v1.1.0`/`v1.1.1` below — found by trying to build a real feature against the real API, not by auditing the backend in the abstract.

## Backend v1.1.2 — Leave Review Queue: Real Employee & Leave-Type Names

The same class of gap as `v1.1.1`, found this time while starting the admin dashboard's Leave screen: `GET /leaves` had bare `employeeId`/`leaveTypeId` strings, no names — exactly what a reviewer needs to decide on a request. Fixed with the same batch-lookup pattern. Also fixed a smaller inconsistency within the same file: `getMyBalance` already resolved leave-type names for balance rows, but `getMyLeaves` didn't for history rows — now it does too. 559 backend tests. Details: [backend/CHANGELOG.md#v112--leave-review-queue-real-employee--leave-type-names](backend/CHANGELOG.md#v112--leave-review-queue-real-employee--leave-type-names).

## Backend v1.1.1 — Attendance Report: Real Employee Names

Another real gap found while building the admin dashboard, this time for Attendance: `GET /attendance`'s rows had no employee name or code, just a bare id — useless for the HR/Manager report it's meant to be. Fixed with one batch lookup per page. Also caught and fixed a real test-isolation bug in the same file (a passing test that only passed because of mock state leaked from an earlier one). 557 backend tests. Details: [backend/CHANGELOG.md#v111--attendance-report-real-employee-names](backend/CHANGELOG.md#v111--attendance-report-real-employee-names).

## Admin Dashboard — Employees Feature

The first full CRUD vertical slice built on the design system: a list (search, department/status filters, pagination), detail view, create/edit forms, and deactivate — role-gated to match the backend's own RBAC exactly (Super Admin/HR/Manager can list, Super Admin/HR can write). The manager field is a real typeahead against `GET /employees/search`, not a truncated dropdown. Sidebar nav now hides `/employees` entirely for a role that can't use it, rather than showing it and letting the API 403. See [admin-dashboard/README.md#features](admin-dashboard/README.md#features).

## Backend v1.1.0 — Departments API

A real gap found while starting the admin dashboard's Employees screen: the backend referenced `Department` everywhere but had no way to ever create one — no route, no seed script. Added `GET/POST /departments` and `PATCH /departments/:id` (Super Admin/HR for writes, read open to all). 555 backend tests. Details: [backend/CHANGELOG.md#v110--departments-api](backend/CHANGELOG.md#v110--departments-api).

## Phase 20 — Documentation & Release — backend v1.0.0

All 20 planned backend phases complete; backend tagged `v1.0.0` (admin-dashboard and mobile-app deliberately stay at `0.1.0` — neither is feature-complete yet, see [Component Status](README.md#component-status)). Caught and fixed a real CI bug on its first live GitHub Actions run (a `docker-build` path resolution mistake), machine-verified the mobile app for the first time ever in this project (installed a real Flutter SDK: 1 lint nit found and fixed, tests already passing, platform folders scaffolded), and fixed a real gap in the Phase 0 API documentation (two implemented endpoints missing from the architecture doc). Details: [backend/CHANGELOG.md#phase-20--documentation--release--v100](backend/CHANGELOG.md#phase-20--documentation--release--v100).

## Phase 19 — Deployment Pipeline

Four GitHub Actions workflows: `ci-backend.yml` (lint/format/typecheck/test/build/Docker build — matches the original plan exactly), `ci-admin.yml` and `ci-mobile.yml` (both with one honest, documented deviation each — no admin-dashboard test suite exists yet, no mobile-app platform scaffolding exists yet), and `deploy.yml` (real but inert until a human connects an actual Render/Vercel account). Details: [backend/CHANGELOG.md#phase-19--deployment-pipeline](backend/CHANGELOG.md#phase-19--deployment-pipeline).

## Phase 18 — Expanded Test Coverage

Backend: ran a real coverage report to find genuine gaps rather than guessing, then closed the four that mattered — `escapeRegExp` (search-injection guard), `nextSequence` (the atomic counter), `email.service.ts` (never tested directly, only mocked away), and the central `errorHandler` (every unhandled failure funnels through it), all now at 100%. Controllers and infrastructure wrappers stay intentionally uncovered — documented why, not silently skipped. 536 backend tests, 87% statement coverage overall. Details: [backend/CHANGELOG.md#phase-18--expanded-test-coverage](backend/CHANGELOG.md#phase-18--expanded-test-coverage).

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
