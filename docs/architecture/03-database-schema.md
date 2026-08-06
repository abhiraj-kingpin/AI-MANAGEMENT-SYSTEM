# 03 — Database Schema (MongoDB / Mongoose)

Database: `ai_management_system`. All timestamps use Mongoose `{ timestamps: true }` (`createdAt`/`updatedAt`) unless noted. All collections get a compound `{ isDeleted: 1 }` soft-delete flag where applicable (audit/compliance data is never hard-deleted).

## users

```ts
{
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true,
                       match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash:      { type: String, required: true, select: false },
  role:              { type: String, enum: ['super_admin','hr','manager','employee'], required: true, index: true },
  isActive:          { type: Boolean, default: true },
  refreshTokenHash:  { type: String, select: false }, // rotated on every refresh
  refreshTokenExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  lastLoginAt:       Date,
  mustChangePassword:{ type: Boolean, default: false },
}
```
**Indexes**: `{ email: 1 }` unique · `{ role: 1 }`
**Validation**: password never returned by default (`select: false`); hashed with bcrypt (cost 12) in a pre-save hook.

## employees

```ts
{
  userId:            { type: ObjectId, ref: 'User', required: true, unique: true },
  employeeCode:       { type: String, required: true, unique: true }, // e.g. EMP-00234
  firstName:          { type: String, required: true, trim: true },
  lastName:           { type: String, required: true, trim: true },
  phone:              { type: String, required: true },
  profileImageUrl:    String, // Cloudinary
  departmentId:       { type: ObjectId, ref: 'Department', required: true, index: true },
  designation:        { type: String, required: true },
  managerId:          { type: ObjectId, ref: 'Employee', default: null, index: true },
  dateOfJoining:      { type: Date, required: true },
  employmentStatus:   { type: String, enum: ['active','on_leave','suspended','terminated'], default: 'active', index: true },
  emergencyContact:   {
    name: String, relationship: String, phone: String,
  },
  bankDetails:        { // sensitive: encrypted at rest via field-level encryption
    accountNumberEnc: String, ifscEnc: String, bankName: String,
  },
  address:            { line1: String, city: String, state: String, pincode: String, country: String },
  isDeleted:           { type: Boolean, default: false },
}
```
**Indexes**: `{ employeeCode: 1 }` unique · `{ departmentId: 1 }` · `{ managerId: 1 }` · text index on `{ firstName, lastName, employeeCode }` for search.
**Validation**: `employeeCode` auto-generated (department prefix + sequence) in service layer, immutable after creation.

## departments

```ts
{
  name:               { type: String, required: true, unique: true },
  code:               { type: String, required: true, unique: true, uppercase: true },
  headOfDepartment:    { type: ObjectId, ref: 'Employee', default: null },
  isActive:           { type: Boolean, default: true },
}
```
**Indexes**: `{ name: 1 }` unique, `{ code: 1 }` unique.

## attendances

```ts
{
  employeeId:         { type: ObjectId, ref: 'Employee', required: true, index: true },
  date:               { type: Date, required: true, index: true }, // normalized to 00:00 local office TZ
  checkInAt:          Date,
  checkOutAt:         Date,
  breaks:             [{ start: Date, end: Date, _id: false }],
  method:             { type: String, enum: ['gps','qr','face','manual'], required: true },
  checkInLocation:    { lat: Number, lng: Number, accuracyMeters: Number },
  checkOutLocation:   { lat: Number, lng: Number, accuracyMeters: Number },
  geofenceId:         { type: ObjectId, ref: 'Geofence', default: null },
  qrCodeId:           { type: ObjectId, ref: 'QRCode', default: null },
  faceMatchConfidence:{ type: Number, min: 0, max: 1, default: null },
  workingMinutes:     { type: Number, default: 0 },
  status:             { type: String, enum: ['present','late','half_day','absent','on_leave'], default: 'present', index: true },
  isOvertime:         { type: Boolean, default: false },
  overtimeMinutes:    { type: Number, default: 0 },
  isCorrected:        { type: Boolean, default: false },
  correctedBy:        { type: ObjectId, ref: 'Employee', default: null },
  correctionReason:   String,
  syncStatus:         { type: String, enum: ['synced','pending','conflict'], default: 'synced' },
  clientGeneratedId:  { type: String, index: true, sparse: true }, // idempotency key from offline mobile writes
}
```
**Indexes**: `{ employeeId: 1, date: 1 }` **unique compound** (one attendance doc per employee per day) · `{ date: 1, status: 1 }` for reports · `{ clientGeneratedId: 1 }` sparse unique for offline-sync idempotency.
**Validation**: `checkOutAt > checkInAt`; `date` must equal the calendar date of `checkInAt` (service-layer check); GPS punches require `checkInLocation` + `geofenceId`; face punches require `faceMatchConfidence >= 0.85` (configurable threshold) or the punch is rejected server-side.

## leaves

```ts
{
  employeeId:   { type: ObjectId, ref: 'Employee', required: true, index: true },
  leaveTypeId:  { type: ObjectId, ref: 'LeaveType', required: true },
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  totalDays:    { type: Number, required: true, min: 0.5 },
  reason:       { type: String, required: true, maxlength: 500 },
  status:       { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending', index: true },
  approvedBy:   { type: ObjectId, ref: 'Employee', default: null },
  managerComment: String,
  attachmentUrl: String, // e.g. medical certificate
}
```
**Indexes**: `{ employeeId: 1, status: 1 }` · `{ startDate: 1, endDate: 1 }`.
**Validation**: `endDate >= startDate`; overlapping approved/pending leave for the same employee rejected at service layer; `totalDays` excludes holidays/weekends (computed against `holidayCalendar`).

## leavetypes
```ts
{ name: { type: String, required: true, unique: true }, defaultAnnualQuota: Number, isPaid: Boolean, carryForward: Boolean, maxCarryForwardDays: Number }
```

## leavebalances
```ts
{ employeeId: { type: ObjectId, ref: 'Employee', index: true }, leaveTypeId: { type: ObjectId, ref: 'LeaveType' }, year: Number, allocated: Number, used: Number, carriedForward: Number }
```
**Indexes**: `{ employeeId: 1, leaveTypeId: 1, year: 1 }` unique compound.

## holidays
```ts
{ name: String, date: { type: Date, index: true }, isOptional: Boolean, branchScope: [{ type: ObjectId, ref: 'Geofence' }] }
```

## shifts
```ts
{
  name:               { type: String, required: true },
  type:               { type: String, enum: ['morning','night','rotational','flexible'], required: true },
  startTime:          { type: String, required: true }, // "09:00"
  endTime:            { type: String, required: true }, // "18:00"
  gracePeriodMinutes: { type: Number, default: 10 },
  isActive:           { type: Boolean, default: true },
}
```

## shiftassignments
```ts
{
  employeeId:    { type: ObjectId, ref: 'Employee', required: true, index: true },
  shiftId:       { type: ObjectId, ref: 'Shift', required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo:   { type: Date, default: null },
}
```
**Indexes**: `{ employeeId: 1, effectiveFrom: -1 }`.

## salaries
```ts
{
  employeeId:    { type: ObjectId, ref: 'Employee', required: true, unique: true },
  baseSalary:    { type: Number, required: true, min: 0 },
  allowances:    { hra: Number, transport: Number, medical: Number, other: Number },
  deductions:    { pf: Number, tax: Number, other: Number },
  currency:      { type: String, default: 'INR' },
  effectiveFrom: { type: Date, required: true },
}
```

## payslips
```ts
{
  employeeId:   { type: ObjectId, ref: 'Employee', required: true, index: true },
  salaryId:     { type: ObjectId, ref: 'Salary', required: true },
  month:        { type: String, required: true }, // "2026-08"
  grossPay:     Number, netPay: Number,
  latePenalty:  { type: Number, default: 0 },
  overtimePay:  { type: Number, default: 0 },
  bonus:        { type: Number, default: 0 },
  pdfUrl:       String,
  status:       { type: String, enum: ['draft','generated','released'], default: 'draft' },
  generatedAt:  Date,
}
```
**Indexes**: `{ employeeId: 1, month: 1 }` unique compound.

## notifications
```ts
{
  recipientId:  { type: ObjectId, ref: 'Employee', default: null, index: true }, // null = broadcast
  title:        { type: String, required: true },
  body:         { type: String, required: true },
  type:         { type: String, enum: ['attendance','leave','salary','shift','holiday','birthday','announcement'], required: true },
  isRead:       { type: Boolean, default: false },
  data:         Schema.Types.Mixed, // deep-link payload
}
```
**Indexes**: `{ recipientId: 1, isRead: 1, createdAt: -1 }`. TTL index optional (`expireAfterSeconds`) to auto-purge read notifications after 90 days.

## qrcodes
```ts
{
  geofenceId:   { type: ObjectId, ref: 'Geofence', required: true },
  token:        { type: String, required: true, unique: true }, // HMAC-signed JWT-like token
  validFrom:    { type: Date, required: true },
  validTo:      { type: Date, required: true },
  isUsed:       { type: Boolean, default: false },
  usedBy:       [{ employeeId: ObjectId, usedAt: Date }], // supports rotating multi-use QR
  singleUse:    { type: Boolean, default: false },
  generatedBy:  { type: ObjectId, ref: 'User', required: true },
}
```
**Indexes**: `{ token: 1 }` unique · `{ validTo: 1 }` TTL-adjacent for cleanup job.
**Validation**: `validTo` capped at `validFrom + 5 minutes` by default (configurable) to limit replay window; server re-validates signature + expiry + geofence + (if `singleUse`) unused status on every scan.

## geofences
```ts
{
  branchName:    { type: String, required: true },
  center:        { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] }, // [lng, lat] GeoJSON
  radiusMeters:  { type: Number, required: true, default: 150 },
  isActive:      { type: Boolean, default: true },
}
```
**Indexes**: `2dsphere` on `center` — enables `$geoNear`/`$geoWithin` queries so attendance validation is a single indexed DB query, not an app-level haversine loop across all branches.

## faceembeddings
```ts
{
  employeeId:      { type: ObjectId, ref: 'Employee', required: true, index: true },
  vector:          { type: [Number], required: true }, // 128-d (ML Kit) or 512-d (TFLite FaceNet)
  sourceImageUrl:  { type: String, required: true, select: false }, // Cloudinary, private/signed
  qualityScore:    Number,
  isActive:        { type: Boolean, default: true },
  registeredAt:    { type: Date, default: Date.now },
}
```
**Indexes**: `{ employeeId: 1, isActive: 1 }`. Vector similarity search done in-app (cosine similarity against the small per-employee candidate set) or via Atlas Vector Search if the workforce scales past ~5,000 employees.
**Validation**: raw face images are never persisted server-side longer than needed to compute the embedding for re-registration flows (auto-deleted from Cloudinary after N days via signed lifecycle rule), only `sourceImageUrl` for the *registration* reference photo is retained, access-gated to HR/Admin.

## documents
```ts
{ employeeId: { type: ObjectId, ref: 'Employee', required: true, index: true }, type: { type: String, enum: ['id_proof','resume','offer_letter','contract','other'] }, fileUrl: String, fileName: String, uploadedAt: { type: Date, default: Date.now } }
```

## auditlogs
```ts
{
  actorId:     { type: ObjectId, ref: 'User', required: true, index: true },
  action:      { type: String, required: true }, // "employee.update", "attendance.correct", "payroll.release"
  entityType:  { type: String, required: true },
  entityId:    { type: ObjectId, required: true },
  before:      Schema.Types.Mixed,
  after:       Schema.Types.Mixed,
  ipAddress:   String,
  userAgent:   String,
}
```
**Indexes**: `{ entityType: 1, entityId: 1, createdAt: -1 }` · `{ actorId: 1, createdAt: -1 }`. Collection capped or retained per compliance window (default 3 years), append-only — no update/delete routes exist for this collection at the API layer.

## Global Conventions
- All `ObjectId` refs are validated to exist via service-layer checks before write (not just schema `ref`, which Mongoose doesn't enforce referential integrity on).
- Soft-delete (`isDeleted` + `deletedAt`) used on `employees`, `departments`, `shifts`; hard-delete disallowed for anything with attendance/payroll history attached.
- All monetary fields stored as integers in minor units (paise) in a future hardening pass to avoid float rounding — documented here as a known v2 improvement; v1 uses `Number` with 2-decimal rounding at the service layer.
- Every collection has `{ timestamps: true }`; `createdAt` is additionally indexed on high-volume collections (`attendances`, `notifications`, `auditlogs`) to support time-range queries and TTL/retention jobs.
