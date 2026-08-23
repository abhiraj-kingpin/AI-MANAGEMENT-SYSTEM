# 08 — Sequence Diagrams

Login and token-refresh sequences live in [07 — Authentication Flow](07-authentication-flow.md#2-login-sequence). This document covers the remaining core flows.

## 1. GPS Attendance Check-In

```mermaid
sequenceDiagram
    actor E as Employee
    participant M as Mobile App
    participant API as Attendance Service
    participant GEO as Geofence Repository
    participant DB as MongoDB

    E->>M: Tap "Check In"
    M->>M: Get current GPS (lat, lng, accuracy)
    alt accuracy worse than 50m
        M-->>E: "GPS signal weak, move to open area"
    else
        M->>API: POST /attendance/check-in {method: gps, location}
        API->>GEO: $geoNear active geofences within radius of location
        GEO->>DB: query geofences (2dsphere index)
        DB-->>GEO: candidate geofence(s)
        alt no geofence contains the point
            API-->>M: 422 OUTSIDE_GEOFENCE (distance to nearest)
            M-->>E: Show distance + retry
        else inside geofence
            API->>DB: upsert Attendance{employeeId, date} check-in fields (unique compound index guards duplicates)
            API->>API: compare checkInAt to assigned Shift.startTime + gracePeriod → set status present/late
            DB-->>API: saved
            API-->>M: 200 {attendanceId, status, checkInAt}
            M-->>E: "Checked in at 09:02 — On time"
        end
    end
```

## 2. QR Attendance (Generate → Scan → Validate)

```mermaid
sequenceDiagram
    actor A as Admin/HR
    participant WEB as Admin Dashboard
    participant API as QR Service
    participant DB as MongoDB
    actor E as Employee
    participant M as Mobile App

    A->>WEB: Open "Office QR" screen
    WEB->>API: POST /qr/generate {geofenceId, validForMinutes: 5}
    API->>API: sign HMAC token {geofenceId, exp}
    API->>DB: insert QRCode{token, validFrom, validTo}
    API-->>WEB: {token, qrImageDataUrl}
    WEB-->>A: Displays QR, auto-regenerates every 5 min

    E->>M: Scan QR at office entrance
    M->>M: decode token from QR image
    M->>API: POST /attendance/check-in {method: qr, token}
    API->>API: verify HMAC signature
    alt signature invalid
        API-->>M: 401 QR_INVALID
    else
        API->>DB: fetch QRCode by token
        alt now > validTo
            API-->>M: 422 QR_EXPIRED
        else alt singleUse && isUsed
            API-->>M: 422 QR_ALREADY_USED
        else
            API->>DB: check employee hasn't already checked in today (unique index)
            API->>DB: create/upsert Attendance{method: qr, qrCodeId, geofenceId}
            API->>DB: mark QRCode.usedBy.push({employeeId, usedAt}) (and isUsed=true if singleUse)
            API-->>M: 200 {attendanceId, status}
            M-->>E: "Checked in via QR"
        end
    end
```

**Anti-fraud notes**: token is HMAC-signed server-side (not just an opaque ID) so a photographed/forwarded QR can't be forged; short `validForMinutes` window limits replay; `singleUse` mode + `usedBy` log prevents one scan being shared among multiple employees; every scan attempt (including rejected ones) is written to `auditlogs` for pattern review (see [Phase 15 AI anomaly detection](../../README.md)).

## 3. Face Recognition Attendance

```mermaid
sequenceDiagram
    actor E as Employee
    participant M as Mobile App
    participant MLKit as ML Kit (on-device)
    participant TFL as TFLite Embedding Model (on-device)
    participant API as Face Service
    participant DB as MongoDB

    E->>M: Open "Face Check-In"
    M->>MLKit: detect faces in camera stream
    alt 0 faces
        MLKit-->>M: no face
        M-->>E: "Position your face in frame"
    else more than 1 face
        MLKit-->>M: multiple faces detected
        M-->>E: 422 "Only one person allowed in frame" (reject, anti-proxy control)
    else exactly 1 face
        MLKit->>M: face bounding box + landmarks
        M->>M: liveness check (blink prompt / head-turn prompt) across frames
        alt liveness fails (static photo/replay suspected)
            M-->>E: "Liveness check failed, try again"
        else liveness passes
            M->>TFL: generate 128/512-d embedding from cropped face
            TFL-->>M: embedding vector
            M->>API: POST /attendance/check-in {method: face, embedding, livenessPassed: true}
            API->>DB: fetch active FaceEmbedding docs for this employeeId
            API->>API: cosine similarity(embedding, stored vectors)
            alt max similarity < threshold (e.g. 0.85)
                API-->>M: 401 FACE_MATCH_LOW_CONFIDENCE
                M-->>E: "Face not recognized, try again or use GPS/QR"
            else match
                API->>DB: create Attendance{method: face, faceMatchConfidence}
                API-->>M: 200 {attendanceId, confidence: 0.94}
                M-->>E: "Checked in — Welcome, Jane"
            end
        end
    end
```

## 4. Face Registration

```mermaid
sequenceDiagram
    actor E as Employee
    participant M as Mobile App
    participant API as Face Service
    participant Q as BullMQ Queue
    participant W as Embedding Worker
    participant CLOUD as Cloudinary
    participant DB as MongoDB

    E->>M: Capture 3–5 face images (different angles)
    M->>API: POST /face/register (multipart images)
    API->>CLOUD: upload reference image (access-controlled)
    API->>DB: FaceEmbedding placeholder docs {status: pending}
    API->>Q: enqueue face-embedding job {employeeId, imageUrls}
    API-->>M: 202 {status: "processing"}
    M-->>E: "Registering your face..." (poll /face/registration-status)

    Q->>W: job picked up
    W->>W: run detection + embedding model per image
    W->>W: quality-score each embedding, discard blurry/dark outliers
    W->>DB: save valid embeddings, isActive=true
    W->>API: (via internal event) trigger push notification
    API-->>M: (push) "Face registration complete"
```

## 5. Offline Attendance Sync

```mermaid
sequenceDiagram
    actor E as Employee
    participant M as Mobile App
    participant Hive as Local Store (Hive)
    participant API as Attendance Service
    participant DB as MongoDB

    Note over M: Device has no internet
    E->>M: Tap "Check In" (GPS method)
    M->>M: capture GPS + timestamp locally
    M->>Hive: save PendingPunch{clientGeneratedId: uuid, type: check_in, ...}
    M-->>E: "Saved offline — will sync when online" (optimistic UI, marked pending)

    Note over M: Connectivity restored
    M->>M: connectivity listener fires
    M->>Hive: read all unsynced PendingPunch records (FIFO by occurredAt)
    M->>API: POST /attendance/sync {punches: [...]}
    API->>API: for each punch, check clientGeneratedId against Attendance.clientGeneratedId (unique sparse index)
    alt already applied (duplicate network retry)
        API-->>M: {clientGeneratedId, status: "duplicate"}
    else new + valid (geofence/shift checks re-run server-side using the punch's original occurredAt)
        API->>DB: apply punch, tag syncStatus: synced
        API-->>M: {clientGeneratedId, status: "applied", attendanceId}
    else conflicting (e.g. a check-in already exists for that day from another device/method)
        API->>DB: keep first-write, flag second as syncStatus: conflict
        API-->>M: {clientGeneratedId, status: "conflict", serverRecord}
    end
    M->>Hive: mark each punch per its returned status; delete "applied"/"duplicate", surface "conflict" to user for manual resolution
    M-->>E: badge clears / conflict banner shown
```

**Conflict resolution policy**: server is always the source of truth once a record exists; conflicting local punches are never silently dropped — they're surfaced to the employee ("Your 9:00 AM check-in was already recorded via QR by someone using this device — contact HR if this wasn't you") and logged to `auditlogs` for the anomaly-detection pass in Phase 15.

## 6. Leave Application & Approval

```mermaid
sequenceDiagram
    actor E as Employee
    participant M as Mobile/Web
    participant API as Leave Service
    participant DB as MongoDB
    participant Q as Notification Queue
    actor Mg as Manager

    E->>M: Submit leave {type, startDate, endDate, reason}
    M->>API: POST /leaves
    API->>DB: check LeaveBalance.remaining >= totalDays
    API->>DB: check no overlapping pending/approved leave
    alt insufficient balance or overlap
        API-->>M: 422 (specific error)
    else
        API->>DB: insert Leave{status: pending}
        API->>Q: enqueue notification → employee's manager
        API-->>M: 201 {leaveId}
        Q-->>Mg: push "Jane applied for 2 days sick leave"
    end

    Mg->>M: Open leave request, add comment, tap Approve
    M->>API: PATCH /leaves/:id/approve {comment}
    API->>DB: update Leave{status: approved, approvedBy, managerComment}
    API->>DB: decrement LeaveBalance.used
    API->>DB: mark affected Attendance days as status: on_leave
    API->>Q: enqueue notification → employee
    API-->>M: 200
    Q-->>E: push "Your leave was approved"
```

## 7. Payroll Generation

```mermaid
sequenceDiagram
    actor A as HR/Admin
    participant WEB as Admin Dashboard
    participant API as Payroll Service
    participant Q as BullMQ Queue
    participant W as Payroll Worker
    participant DB as MongoDB
    participant PDF as PDF Generator

    A->>WEB: Select month, click "Run Payroll"
    WEB->>API: POST /payroll/run {month: "2026-08"}
    API->>Q: enqueue payroll-run job {month, employeeIds: all active}
    API-->>WEB: 202 {runId}
    WEB->>WEB: poll GET /payroll/runs/:runId/status

    Q->>W: job picked up
    loop each employee
        W->>DB: fetch Salary, Attendance summary, approved Leave, LatePenalty rules
        W->>W: compute grossPay, overtimePay, latePenalty, bonus, netPay
        W->>DB: upsert Payslip{status: draft}
    end
    W->>WEB: (via status endpoint) runId complete, N payslips drafted

    A->>WEB: Review drafts, click "Release"
    WEB->>API: PATCH /payslips/:id/release (or bulk)
    API->>PDF: generate payslip PDF
    PDF-->>API: pdfUrl (Cloudinary)
    API->>DB: Payslip{status: released, pdfUrl}
    API->>Q: enqueue notification-fanout → employee
    Q-->>E: push "Your August payslip is ready"
```

## 8. Push Notification Fan-out

```mermaid
sequenceDiagram
    participant SRC as Any Module (attendance/leave/payroll/shift)
    participant Q as BullMQ notification-fanout queue
    participant W as Notification Worker
    participant DB as MongoDB
    participant FCM as Firebase Cloud Messaging
    participant M as Mobile/Web Client

    SRC->>Q: enqueue {recipientId | broadcast, type, title, body, data}
    Q->>W: job picked up
    W->>DB: insert Notification doc (in-app inbox)
    W->>DB: fetch recipient's registered device tokens
    W->>FCM: send multicast push
    FCM-->>M: push delivered (background/foreground handler)
    M->>M: tap → GoRouter/React Router deep-link via `data.route`
    M->>DB: (on open) PATCH /notifications/:id/read
```
