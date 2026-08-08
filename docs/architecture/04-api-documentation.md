# 04 — API Documentation

Base URL: `https://api.ai-management-system.app/v1` (prod) · `http://localhost:5000/api/v1` (dev)

All responses use a consistent envelope:
```json
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 134 } }
// error
{ "success": false, "error": { "code": "ATTENDANCE_OUTSIDE_GEOFENCE", "message": "You are 420m from the office. Move within 150m to check in.", "details": {} } }
```
Auth: `Authorization: Bearer <accessToken>` header on every route except `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/refresh`.

Full machine-readable contract lives in `docs/api/openapi.yaml` (generated from Zod schemas via `zod-to-openapi`); this file is the human-readable index.

## Auth (`/auth`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Super Admin, HR | Create a user + optionally linked employee |
| POST | `/auth/login` | Public | Email + password → access + refresh token |
| POST | `/auth/refresh` | Public (valid refresh cookie/token) | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | Authenticated | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Emails a time-boxed reset token |
| POST | `/auth/reset-password` | Public (valid reset token) | Set new password |
| POST | `/auth/change-password` | Authenticated | Change password with current-password confirmation |
| GET  | `/auth/me` | Authenticated | Current user + employee profile |

**POST `/auth/login`**
```json
// request
{ "email": "jane@acme.com", "password": "••••••••" }
// 200 response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { "id": "665f...", "email": "jane@acme.com", "role": "employee" },
    "employee": { "id": "665e...", "employeeCode": "EMP-00234", "firstName": "Jane" }
  }
}
// 401
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }
```

## Employees (`/employees`) — Super Admin, HR (full); Manager (read, own team); Employee (read/update own profile subset)

| Method | Path | Description |
|---|---|---|
| GET | `/employees` | List, `?page=&limit=&search=&department=&status=&sortBy=&order=` |
| POST | `/employees` | Create employee (+ auto-creates linked User) |
| GET | `/employees/:id` | Get one |
| PATCH | `/employees/:id` | Update fields |
| DELETE | `/employees/:id` | Soft-delete |
| POST | `/employees/:id/image` | Upload profile image (multipart → Cloudinary) |
| POST | `/employees/:id/documents` | Upload document (multipart) |
| GET | `/employees/:id/documents` | List documents |
| GET | `/employees/search?q=` | Typeahead search (name/code/email) |

## Attendance (`/attendance`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/attendance/check-in` | Employee | Body varies by `method`: `gps`\|`qr`\|`face`\|`manual`(Admin only) |
| POST | `/attendance/check-out` | Employee | Ends the open attendance record for today |
| POST | `/attendance/break/start` | Employee | Starts a break window |
| POST | `/attendance/break/end` | Employee | Ends the open break window |
| GET | `/attendance/me` | Employee | Own history, `?from=&to=` |
| POST | `/attendance/:id/request-correction` | Employee | Self-requests an amendment to their own check-in/out time; pending until reviewed |
| GET | `/attendance` | HR, Manager, Admin | Filtered report, `?employeeId=&departmentId=&from=&to=&status=` |
| PATCH | `/attendance/:id/correct` | HR, Admin | Direct correction, no approval step, mandatory `reason` (audit-logged) — distinct from the self-request flow above |
| POST | `/attendance/:id/approve-correction` | Manager, HR, Admin | Approves a self-requested correction |
| POST | `/attendance/:id/reject-correction` | Manager, HR, Admin | Rejects a self-requested correction |
| GET | `/attendance/export/excel` | HR, Admin | Streams `.xlsx` |
| GET | `/attendance/export/pdf` | HR, Admin | Streams `.pdf` |
| POST | `/attendance/sync` | Employee (mobile) | Bulk-submit offline-queued punches, idempotent via `clientGeneratedId` |

**POST `/attendance/check-in`** (GPS method)
```json
{ "method": "gps", "location": { "lat": 12.9716, "lng": 77.5946, "accuracyMeters": 8 } }
```
```json
// 200
{ "success": true, "data": { "attendanceId": "665f...", "status": "present", "checkInAt": "2026-08-04T09:02:11Z", "geofence": "HQ - Bengaluru" } }
// 422 outside geofence
{ "success": false, "error": { "code": "OUTSIDE_GEOFENCE", "message": "You are 420m from HQ - Bengaluru. Move within 150m." } }
```

**POST `/attendance/check-in`** (QR method)
```json
{ "method": "qr", "token": "eyJhbGciOi..." }
```
Server checks: signature valid → not expired (`validTo`) → not already used (if `singleUse`) → geofence still active → employee hasn't already checked in today. Failure returns `QR_EXPIRED`, `QR_ALREADY_USED`, or `QR_INVALID`.

**POST `/attendance/check-in`** (Face method)
```json
{ "method": "face", "imageBase64": "..." }
```
```json
{ "success": true, "data": { "attendanceId": "665f...", "confidence": 0.94, "livenessPassed": true } }
```
Rejected below the configured confidence threshold with `FACE_MATCH_LOW_CONFIDENCE`, or `LIVENESS_CHECK_FAILED` if a static photo/replay is suspected.

**POST `/attendance/sync`** (offline batch)
```json
{
  "punches": [
    { "clientGeneratedId": "uuid-1", "type": "check_in", "method": "gps", "location": {...}, "occurredAt": "2026-08-03T09:01:00Z" },
    { "clientGeneratedId": "uuid-2", "type": "check_out", "occurredAt": "2026-08-03T18:05:00Z" }
  ]
}
```
Response echoes per-item `{ clientGeneratedId, status: "applied"|"duplicate"|"conflict", attendanceId }` — see [Offline Sync sequence](08-sequence-diagrams.md#5-offline-attendance-sync).

## GPS / Geofence (`/geofences`) — Super Admin, HR

| Method | Path | Description |
|---|---|---|
| GET | `/geofences` | List all branch locations |
| POST | `/geofences` | Create `{ branchName, center: {lat,lng}, radiusMeters }` |
| PATCH | `/geofences/:id` | Update radius/coords/active |
| DELETE | `/geofences/:id` | Deactivate |
| GET | `/geofences/nearby?lat=&lng=` | Debug endpoint: which geofence(s) contain this point |

## QR Attendance (`/qr`) — Admin/HR generate; Employee scans via `/attendance/check-in`

| Method | Path | Description |
|---|---|---|
| POST | `/qr/generate` | `{ geofenceId, validForMinutes: 5, singleUse: false }` → returns token + QR image (data URL) |
| GET | `/qr/active?geofenceId=` | Currently valid QR for a branch (dashboard display, auto-refreshing) |
| POST | `/qr/:id/revoke` | Immediately invalidate |

## Face Recognition (`/face`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/face/register` | Employee (self) or HR | Multipart: 3–5 images → embeddings generated async, stored |
| GET | `/face/registration-status` | Employee | Whether registration is complete/pending/failed |
| POST | `/face/verify` | Employee | Used internally by check-in; also exposed standalone for testing |
| DELETE | `/face/:employeeId` | HR, Admin | Remove registered face data (GDPR-style right to erasure) |

## Leave (`/leaves`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/leaves` | Employee | Apply |
| PATCH | `/leaves/:id/cancel` | Employee | Cancel own pending/future-dated leave |
| GET | `/leaves/me` | Employee | Own history |
| GET | `/leaves/balance` | Employee | Remaining balance per leave type |
| GET | `/leaves` | Manager, HR | Team/company queue, `?status=pending` |
| PATCH | `/leaves/:id/approve` | Manager, HR | + optional comment |
| PATCH | `/leaves/:id/reject` | Manager, HR | + required comment |
| GET/POST | `/leave-types` | HR, Admin | CRUD leave types |
| GET/POST | `/holidays` | HR, Admin | Holiday calendar CRUD |

## Shifts (`/shifts`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET/POST | `/shifts` | HR, Admin | CRUD shift definitions |
| POST | `/shifts/assign` | HR, Admin | `{ employeeId, shiftId, effectiveFrom }` |
| POST | `/shifts/assign/bulk` | HR, Admin | `{ employeeIds: [...], shiftId, effectiveFrom }` |
| GET | `/shifts/me` | Employee | Current effective shift |

## Payroll (`/payroll`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET/POST | `/salaries` | HR, Admin | CRUD base salary structure per employee |
| POST | `/payroll/run` | HR, Admin | Trigger batch payslip generation for a month (queued job) |
| GET | `/payroll/runs/:runId/status` | HR, Admin | Poll batch job progress |
| GET | `/payslips` | HR, Admin | List, filter by month/department |
| GET | `/payslips/me` | Employee | Own payslips |
| GET | `/payslips/:id/pdf` | Employee (own) / HR, Admin | Download |
| PATCH | `/payslips/:id/release` | HR, Admin | Marks released → triggers notification |

## Notifications (`/notifications`)

| Method | Path | Description |
|---|---|---|
| GET | `/notifications/me` | Paginated, `?unread=true` |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |
| POST | `/notifications/broadcast` | HR, Admin — announcement to all/department |
| POST | `/notifications/device-token` | Register FCM device token for push |

## Analytics (`/analytics`) — HR, Manager (scoped), Admin

| Method | Path | Description |
|---|---|---|
| GET | `/analytics/dashboard` | Headline KPIs: headcount, attendance %, late %, leave % |
| GET | `/analytics/attendance-trend?period=monthly` | Time series for charts |
| GET | `/analytics/department-comparison` | Cross-department metrics |
| GET | `/analytics/ai/late-risk` | Predicted late-risk employees (see [Phase 15](../../README.md)) |
| GET | `/analytics/ai/absenteeism-trend` | Trend + forecast |
| GET | `/analytics/ai/anomalies` | Fraud/location-anomaly/duplicate-face flags |
| GET | `/analytics/export/csv` | Export current view |
| GET | `/analytics/export/pdf` | Export current view |

## Audit (`/audit-logs`) — Super Admin only

| Method | Path | Description |
|---|---|---|
| GET | `/audit-logs` | `?entityType=&entityId=&actorId=&from=&to=` |

## Conventions
- **Pagination**: `?page=1&limit=20` (max `limit=100`), response `meta.total`/`meta.page`/`meta.pages`.
- **Sorting**: `?sortBy=createdAt&order=desc`.
- **Filtering**: field-specific query params, documented per resource above; free-text via `?search=`.
- **Idempotency**: mutating mobile-offline endpoints (`/attendance/sync`) require `clientGeneratedId`; server dedupes.
- **Versioning**: URL-prefixed (`/v1`); breaking changes ship as `/v2` with the old version maintained for a deprecation window.
- **Rate limits**: default 100 req/min/user; `/auth/login` 5 req/min/IP; `/attendance/check-in` 10 req/min/user.
