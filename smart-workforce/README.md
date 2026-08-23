# AI Management System

An enterprise workforce management platform: GPS/QR/face attendance, leave, shift scheduling, payroll, and notifications — a Node.js/Express/TypeScript backend, a React admin dashboard, and a Flutter mobile app, all sharing one MongoDB database.

## Overview

Employees use the **mobile app** to check in/out, apply for leave, and view their shifts, payslips, and notifications. HR, managers, and admins use the **admin dashboard** to manage employees, review and correct attendance, approve leave, run payroll, and view AI-driven workforce insights. Both clients talk to the same **backend REST API**, which is the single source of truth for all workforce data.

## Architecture

**Frontend** — React + Vite + TypeScript admin dashboard (Tailwind CSS, React Router, TanStack Query, Zustand) for HR/Manager/Admin use.

**Backend** — Node.js + Express + TypeScript REST API. Role-based access control, JWT auth with rotating refresh tokens, and the face/GPS/QR attendance and analytics logic all live here.

**Database** — MongoDB (Mongoose), shared by the backend as the single data store for both clients.

**Mobile application** — Flutter employee app (Riverpod, Dio, GoRouter, Hive for the offline attendance queue), with on-device face detection/liveness/embedding via ML Kit and ONNX Runtime.

**External services** — Cloudinary (file storage), Firebase Cloud Messaging (push notifications), MongoDB Atlas and Render/Vercel for hosting.

## Project Structure

```
smart-workforce/
├── backend/            Express + TypeScript REST API + MongoDB
├── admin-dashboard/    React + Vite + TypeScript — HR/Manager/Admin web console
├── mobile-app/         Flutter — employee self-service app
└── docs/architecture/  Original system design docs: schema, API contract, auth flow, deployment
```

## How It Works

```
 ┌───────────────┐        ┌──────────────────┐
 │  Mobile App    │        │  Admin Dashboard  │
 │  (employees)   │        │  (HR/Manager/Admin)│
 └───────┬────────┘        └─────────┬─────────┘
         │        HTTPS + JWT        │
         └─────────────┬─────────────┘
                        ▼
              ┌───────────────────┐
              │   Backend REST API │
              │  (Express, RBAC)   │
              └─────────┬──────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     ┌─────────┐  ┌───────────┐ ┌───────────┐
     │ MongoDB  │  │ Cloudinary │ │  Firebase  │
     │ (data)   │  │ (files)    │ │  (push)    │
     └─────────┘  └───────────┘ └───────────┘
```

**Auth** — A user logs in with email/password; the backend issues a short-lived JWT access token plus a rotating refresh token. The access token is sent on every request and is checked against the caller's role (`super_admin` / `hr` / `manager` / `employee`) at the route, and against *which record* they're allowed to touch inside the service layer (e.g. a manager only sees their own team).

**Attendance check-in** — From the mobile app, an employee checks in one of three ways:
- **GPS**: the app sends its coordinates; the backend confirms they fall inside a registered office geofence.
- **QR**: the app scans a time-boxed, signed QR code the admin dashboard generates per office location.
- **Face**: the app captures a photo, detects the face, runs an on-device liveness check (to reject photos/video replays), generates a face embedding, and sends it to the backend, which compares it against the employee's stored embedding.

Each successful check-in/out feeds working-hours, overtime, and late/half-day calculations, which in turn drive payroll and the admin dashboard's attendance reports.

**Face registration** — Before face check-in works, an employee registers their face (via the mobile app or an admin-side upload): several frames are captured, a face is detected and aligned, and an embedding vector is generated and stored. Check-in later compares a fresh embedding against that stored vector rather than the raw photo.

**Offline mode** — If the mobile app has no connectivity when an employee checks in, the attempt is queued on-device; once the connection returns, the app syncs the queue with the backend automatically.

**Leave, shifts, payroll, notifications** — An employee applies for leave or views their shift/payslip from the mobile app; HR/managers review and act on it from the admin dashboard. Payroll runs as a batch job over a pay period's attendance records, producing downloadable PDF payslips. Any state change (leave approved, payslip released, broadcast message, etc.) creates an in-app notification, and can also fan out as a push notification.

**AI-driven insights** — The backend continuously analyzes attendance data to power the admin dashboard's "AI Insights" screen: a late-arrival risk ranking, an absenteeism forecast, and an anomaly sweep (unusual check-in locations, duplicate faces across employees, overtime outliers) — surfaced as transparent statistics rather than opaque black-box scores.

## Features

**Attendance**
- GPS, QR, and Face check-in/check-out, all feeding the same attendance record
- Geofenced offices, time-boxed signed QR codes, on-device liveness-checked face recognition
- Offline queue with automatic sync once back online
- HR/Manager reporting with filters, corrections, and an employee-initiated correction/approval workflow

**Leave Management**
- Self-service apply/cancel with real balance accounting (business days + holidays)
- Approval/rejection queue for HR and managers

**Shift Scheduling**
- Shift definitions with single/bulk employee assignment
- Employee-facing read-only shift view, driving attendance's late/overtime math

**Payroll**
- Salary structures (allowances/deductions)
- Batch payslip generation per pay period, with downloadable PDFs

**Notifications**
- In-app inbox with read/unread state
- Org-wide or department broadcasts from the admin dashboard
- Push notification delivery via Firebase

**AI-Powered Analytics** *(admin dashboard)*
- Dashboard KPIs, attendance trend chart, department comparison
- Late-arrival risk ranking and absenteeism forecast
- Anomaly detection (rule-based checks plus an unsupervised ML model over attendance data)

**Security & Access Control**
- JWT access + rotating refresh tokens, role-based access control (RBAC)
- Account lockout after repeated failed logins
- Append-only audit trail

## Tech Stack

| Layer            | Stack                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| Backend           | Node.js, Express, TypeScript, MongoDB (Mongoose)                                        |
| Admin Dashboard   | React, Vite, TypeScript, Tailwind CSS, React Router, Axios, TanStack Query, Zustand      |
| Mobile            | Flutter, Riverpod, Dio, GoRouter, Hive, ML Kit + ONNX Runtime                            |
| Infra             | MongoDB Atlas, Cloudinary, Firebase Cloud Messaging, Docker                              |

## Getting Started

Each project is independently runnable — see its own README for exact steps:

- **Backend**: [backend/README.md](backend/README.md) — `npm install && npm run dev`, or `docker compose up --build` for API + MongoDB.
- **Admin dashboard**: [admin-dashboard/README.md](admin-dashboard/README.md) — `npm install && npm run dev`.
- **Mobile app**: [mobile-app/README.md](mobile-app/README.md) — `flutter pub get && flutter run`.

## License

Proprietary — internal enterprise project.
