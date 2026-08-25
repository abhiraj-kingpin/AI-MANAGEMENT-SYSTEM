# AI Management System

## 1. What Is This System?

AI Management System is an **employee/workforce management system**.

It helps a company manage:

* Employee attendance
* GPS, QR and Face check-in
* Leave
* Shift schedules
* Payroll
* Notifications
* Offices and locations
* Employee face registration
* Reports and analytics
* AI-based workforce insights
* Users, roles and permissions

The system has **three main parts**:

1. **Mobile App** — used by employees
2. **Admin Dashboard** — used by HR, managers and admins
3. **Backend API** — connects everything together

All important data is stored in **MongoDB**.

---

# 2. Simple System Flow

The easiest way to understand the system is:

```text
              EMPLOYEE
                 |
                 v
          ┌──────────────┐
          │  Mobile App  │
          └──────┬───────┘
                 |
                 | HTTPS + JWT
                 v
          ┌──────────────┐
          │   Backend    │
          │  REST API    │
          └──────┬───────┘
                 |
        ┌────────┼────────┐
        |        |        |
        v        v        v
    MongoDB  Cloudinary  Firebase
      Data      Files      Push
                 ^
                 |
          ┌──────┴───────┐
          │Admin Dashboard│
          └──────────────┘
                 ^
                 |
          HR / Manager / Admin
```

### In simple words

**Mobile App**

Employees use the app to:

* Login
* Check in
* Check out
* Apply for leave
* See shifts
* See payslips
* See notifications

**Admin Dashboard**

HR, managers and admins use the dashboard to:

* Manage employees
* Check attendance
* Correct attendance
* Approve leave
* Manage shifts
* Run payroll
* Manage offices
* View reports
* View AI insights
* Manage users and permissions

**Backend**

The backend is the **main brain of the system**.

It:

* Receives requests from the mobile app and dashboard
* Checks authentication
* Checks user permissions
* Validates data
* Runs business logic
* Saves and reads data from MongoDB
* Sends notifications
* Calculates attendance and payroll
* Runs analytics

---

# 3. Project Structure

```text
smart-workforce/
│
├── backend/
│   └── Node.js + Express + TypeScript API
│
├── admin-dashboard/
│   └── React web application
│
├── mobile-app/
│   └── Flutter employee application
│
└── docs/
    └── Architecture and system documentation
```

---

# 4. Who Uses the System?

There are four main roles:

| Role        | What They Can Do                               |
| ----------- | ---------------------------------------------- |
| Super Admin | Full system access                             |
| HR          | Employees, attendance, leave, payroll, reports |
| Manager     | Manage/review their own team                   |
| Employee    | Attendance, leave, shifts, payslips            |

The backend checks the user's role before allowing an operation.

For example:

```text
Employee
   ↓
Can see own attendance

Manager
   ↓
Can see/manage their team

HR
   ↓
Can manage company workforce

Super Admin
   ↓
Full access
```

---

# 5. Login Flow

When a user logs in:

```text
User enters email + password
            ↓
       Mobile/Dashboard
            ↓
         Backend
            ↓
   Check email/password
            ↓
      Check account status
            ↓
       Create tokens
            ↓
 Return access + refresh token
            ↓
 User is logged in
```

The system uses:

* JWT access token
* Rotating refresh token
* Role-based access control
* Account lockout after repeated failed logins

The access token is sent with API requests.

The backend checks:

1. Is the user logged in?
2. What role does the user have?
3. Is the user allowed to perform this action?
4. Which records can the user access?

---

# 6. Attendance Flow

Attendance is one of the main parts of the system.

Employees can check in/out using:

* GPS
* QR Code
* Face Recognition

All three methods eventually create/update the **same attendance system**.

---

## 6.1 GPS Attendance

```text
Employee opens app
       ↓
Selects Check In
       ↓
App gets GPS location
       ↓
Location sent to Backend
       ↓
Backend checks office geofence
       ↓
Inside allowed area?
     /       \
   YES        NO
    ↓          ↓
 Check In    Reject
```

The employee can check in only when their location satisfies the configured office geofence.

---

# 7. QR Attendance

The admin dashboard can generate a QR code for an office.

The QR code is:

* Signed
* Time-limited
* Associated with an office

Flow:

```text
Admin creates QR
      ↓
Backend generates signed QR
      ↓
Employee scans QR
      ↓
Mobile app sends QR information
      ↓
Backend validates QR
      ↓
QR valid?
   /      \
 YES       NO
  ↓         ↓
Check In  Reject
```

The system also tracks the QR lifecycle, such as:

* Issued
* Active
* Expired
* Revoked
* Scan count

---

# 8. Face Attendance

Face attendance uses the employee's registered face.

Before using face attendance, the employee must register their face.

### Face Registration

```text
Employee starts registration
          ↓
Capture several face frames
          ↓
Detect face
          ↓
Align face
          ↓
Generate face embedding
          ↓
Store embedding
```

The system stores the **face embedding**, not the raw face image as the attendance identity.

### Face Check-In

```text
Employee selects Face Check-In
          ↓
Camera captures face
          ↓
Face detected
          ↓
Liveness check
          ↓
Generate face embedding
          ↓
Send embedding to Backend
          ↓
Compare with registered embedding
          ↓
Match?
       /      \
     YES       NO
      ↓         ↓
   Check In   Reject
```

The liveness check helps prevent someone from simply showing a photo or video replay.

---

# 9. Offline Attendance

The mobile app can handle attendance when there is no internet connection.

```text
Employee checks in
       ↓
No internet
       ↓
Save attendance attempt
on device
       ↓
Internet comes back
       ↓
App automatically syncs
       ↓
Backend processes request
       ↓
Attendance updated
```

The mobile app uses an offline queue for this.

---

# 10. Attendance Calculation

After a successful check-in/check-out, the system can calculate:

* Working hours
* Late arrival
* Overtime
* Half-day
* Attendance status

Example:

```text
Check In: 09:30
Check Out: 18:30
       ↓
Backend calculates
       ↓
Working hours
Late status
Overtime
       ↓
Attendance record
       ↓
Used by reports + payroll
```

Attendance data is also used by the analytics system.

---

# 11. Leave Management Flow

Employees can apply for leave from the mobile app.

```text
Employee applies for leave
          ↓
Backend checks leave balance
          ↓
Leave request created
          ↓
HR/Manager sees request
          ↓
Approve or Reject
       /       \
   Approved   Rejected
      ↓          ↓
Balance       Request
updated       closed
```

The system supports:

* Leave balance
* Business-day calculation
* Holidays
* Leave approval
* Leave rejection
* Leave cancellation
* Leave calendar

---

# 12. Shift Management

HR/Admin can create shifts.

Example:

```text
Morning Shift
09:00 AM → 06:00 PM
```

Employees can then be assigned to shifts.

The system provides:

* Individual assignment
* Bulk assignment
* Weekly roster
* Employee shift view

The assigned shift is important because attendance calculations use it to determine things like:

* Late arrival
* Expected working hours
* Overtime

---

# 13. Payroll Flow

Payroll uses employee salary information and attendance information.

Simple flow:

```text
Employee Salary
      +
Attendance
      +
Working Hours
      +
Overtime
      +
Allowances
      -
Deductions
      ↓
Payroll Calculation
      ↓
Payslip Generated
      ↓
PDF Payslip
      ↓
Released to Employee
```

HR can generate payslips for a pay period.

Employees can view/download their payslips from the mobile app.

---

# 14. Notifications

Notifications are generated when important events happen.

For example:

```text
Leave Approved
      ↓
Backend creates notification
      ↓
Notification appears
in mobile app
      ↓
Firebase can also send
push notification
```

Notifications can be used for:

* Leave approval
* Leave rejection
* Payslip release
* Company announcements
* Department announcements
* Other important system events

---

# 15. Admin Dashboard Flow

The admin dashboard is the main control center for HR, managers and admins.

The dashboard can be used to manage:

```text
Employees
    ↓
Attendance
    ↓
Departments
    ↓
Leave
    ↓
Shifts
    ↓
Payroll
    ↓
Offices
    ↓
Face Management
    ↓
QR Attendance
    ↓
Notifications
    ↓
AI Analytics
    ↓
Users & Roles
    ↓
Settings
    ↓
Audit Logs
```

---

# 16. Departments

Each department can show information such as:

* Department head
* Number of employees
* Attendance percentage
* Employees on leave
* Coverage

The admin can also open a department and directly view its employees.

---

# 17. Offices and Locations

A company can have multiple offices.

Each building has its own geofence.

Example:

```text
Company
  |
  ├── Delhi Office
  │      ├── Floor 1
  │      ├── Floor 2
  │      └── Rooms
  │
  └── Mumbai Office
         ├── Floor 1
         └── Rooms
```

An employee has a primary office.

The office location is used for GPS attendance.

---

# 18. Face Management

Admins can see face enrollment status.

For example:

* Enrolled
* Not registered
* Re-enrollment required
* Verifications today

The admin console shows the employee's **enrollment state** rather than displaying the raw biometric template.

---

# 19. AI Analytics

The system also analyzes workforce attendance data.

The dashboard can show:

* Attendance trends
* Department comparison
* Punctuality
* Overtime concentration
* Late-arrival risk
* Absenteeism forecast
* Attendance anomalies

The system also provides statistics such as:

* Confidence interval
* Month-over-month trend
* R² fit statistic
* Backtest error
* Department contribution

The goal is to help HR understand workforce patterns.

---

# 20. Anomaly Detection

The system checks attendance data for unusual activity.

Examples:

```text
Unusual check-in location
        ↓
Potential anomaly

Duplicate face
        ↓
Potential anomaly

Very high overtime
        ↓
Potential anomaly
```

The system uses rule-based checks and an unsupervised ML model for attendance anomalies.

---

# 21. Alerts Center

The Alerts Center brings important issues into one place.

It can contain:

* Attendance anomalies
* Pending attendance corrections
* Leave exceptions
* Payroll exceptions
* AI-generated workforce signals

HR/Admin can:

* View
* Act
* Filter
* Snooze alerts

---

# 22. Attendance Correction

Sometimes an employee's attendance is wrong.

For example:

```text
Old Check-In: 09:00
New Check-In: 09:30
```

HR/Manager can review the correction.

```text
Correction Requested
        ↓
HR/Manager Reviews
        ↓
Approve / Reject
      /       \
 Approve     Reject
    ↓           ↓
Attendance   Original
updated      remains
```

The system keeps the change in the audit log.

---

# 23. Audit Logs

Important actions are recorded.

For example:

```text
Who?
 ↓
HR User

What?
 ↓
Changed attendance

Which record?
 ↓
Employee attendance

What changed?
 ↓
09:00 → 09:30

Result?
 ↓
Approved
```

This creates an append-only history of important system actions.

---

# 24. Data Flow

Almost everything follows the same basic pattern:

```text
User Action
    ↓
Mobile App / Admin Dashboard
    ↓
REST API
    ↓
Authentication
    ↓
Permission Check
    ↓
Business Logic
    ↓
MongoDB
    ↓
Response
    ↓
Mobile App / Dashboard
```

This is important:

> **The frontend does not directly talk to MongoDB.**

Both the mobile app and admin dashboard communicate with the backend.

The backend is the **single source of truth**.

---

# 25. External Services

The system also uses external services.

### MongoDB Atlas

Stores application data.

```text
Employees
Attendance
Leave
Shifts
Payroll
Users
Notifications
etc.
```

### Cloudinary

Used for file storage.

### Firebase Cloud Messaging

Used for push notifications.

### Render / Vercel / Docker

Used for deployment and hosting.

---

# 26. Technology Used

### Backend

* Node.js
* Express
* TypeScript
* MongoDB
* Mongoose

### Admin Dashboard

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* TanStack Query
* Zustand
* Axios

### Mobile App

* Flutter
* Riverpod
* Dio
* GoRouter
* Hive
* ML Kit
* ONNX Runtime

---

# 27. Complete Example: Employee Starts Their Day

Here is a simple real-world example.

### Step 1 — Employee opens the app

```text
Employee
   ↓
Mobile App
   ↓
Login
```

### Step 2 — Employee checks in

They choose GPS, QR or Face.

```text
Mobile App
   ↓
Backend
   ↓
Validate attendance
   ↓
Create attendance record
```

### Step 3 — System calculates attendance

The backend checks the employee's shift.

```text
Shift: 09:00
Check-in: 09:15

        ↓

Employee is late by 15 minutes
```

### Step 4 — Employee works

The employee can see their attendance status from the app.

### Step 5 — Employee checks out

```text
Check Out
   ↓
Backend
   ↓
Calculate working hours
   ↓
Calculate overtime if applicable
```

### Step 6 — Payroll uses this information

At the end of the pay period:

```text
Attendance
+
Salary
+
Overtime
+
Allowances
-
Deductions
       ↓
Payroll
       ↓
Payslip
```

### Step 7 — Employee receives payslip

HR releases the payslip.

```text
HR releases payslip
       ↓
Backend
       ↓
Notification
       ↓
Employee Mobile App
       ↓
Employee downloads PDF
```

---

# 28. Complete System in One Picture

```text
                     COMPANY
                        |
          ┌─────────────┴─────────────┐
          |                           |
       EMPLOYEES                  HR / ADMIN
          |                           |
          v                           v
   ┌──────────────┐          ┌────────────────┐
   │ Mobile App   │          │ Admin Dashboard│
   └──────┬───────┘          └───────┬────────┘
          |                          |
          └──────────┬───────────────┘
                     |
                     v
             ┌───────────────┐
             │ Backend API   │
             │ Node/Express  │
             └───────┬───────┘
                     |
        ┌────────────┼────────────┐
        |            |            |
        v            v            v
   ┌─────────┐ ┌──────────┐ ┌──────────┐
   │ MongoDB │ │Cloudinary│ │ Firebase │
   │  Data   │ │  Files   │ │  Push    │
   └─────────┘ └──────────┘ └──────────┘
                     |
                     v
              Business Logic
                     |
       ┌─────────────┼─────────────┐
       |             |             |
       v             v             v
  Attendance       Payroll       Analytics
       |             |             |
       └─────────────┼─────────────┘
                     |
                     v
                Notifications
```

---

# 29. Important Rule to Remember

If you are new to this project, remember these **5 things**:

### 1. Mobile App = Employee Side

Employees use it for their daily work.

### 2. Admin Dashboard = Management Side

HR, managers and admins use it to manage employees and company operations.

### 3. Backend = Brain

The backend handles authentication, permissions, calculations and business rules.

### 4. MongoDB = Main Database

Important system data is stored here.

### 5. Backend Controls Everything

The frontend should not directly access the database.

```text
Mobile App ──────┐
                 │
                 ▼
             Backend
                 │
                 ▼
             MongoDB
                 ▲
                 │
Admin Dashboard ─┘
```

---

# 30. Running the Project

Each part of the system can be run separately.

### Backend

```bash
cd backend
npm install
npm run dev
```

Or use Docker:

```bash
docker compose up --build
```

### Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```

### Mobile App

```bash
cd mobile-app
flutter pub get
flutter run

