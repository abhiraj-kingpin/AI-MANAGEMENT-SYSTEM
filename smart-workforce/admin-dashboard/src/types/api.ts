
export type Role = 'super_admin' | 'hr' | 'manager' | 'employee';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface EmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headOfDepartment: EmployeeSummary | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  headOfDepartment?: string;
}

export type UpdateDepartmentInput = Partial<Omit<CreateDepartmentInput, 'headOfDepartment'>> & {
  headOfDepartment?: string | null;
  isActive?: boolean;
};

export interface Employee extends EmployeeSummary {
  email: string;
  role: Role;
  isActive: boolean;
  accountClaimed: boolean;
  phone: string;
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  designation: string;
  manager: EmployeeSummary | null;
  primaryOffice: { id: string; branchName: string } | null;
  dateOfJoining: string;
  employmentStatus: EmploymentStatus;
  emergencyContact: EmergencyContact;
  address: Address;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  email: string;
  role?: Exclude<Role, 'super_admin'>;
  firstName: string;
  lastName: string;
  phone: string;
  departmentId: string;
  designation: string;
  managerId?: string;
  primaryOfficeId?: string;
  dateOfJoining: string;
  emergencyContact?: EmergencyContact;
  address?: Address;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  departmentId?: string;
  designation?: string;
  managerId?: string | null;
  primaryOfficeId?: string | null;
  dateOfJoining?: string;
  employmentStatus?: EmploymentStatus;
  emergencyContact?: EmergencyContact;
  address?: Address;
}

export type AttendanceMethod = 'gps' | 'qr' | 'face' | 'manual';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface CorrectionRequest {
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: CorrectionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  method: AttendanceMethod;
  checkInLocation: GeoPoint | null;
  checkOutLocation: GeoPoint | null;
  geofenceId: string | null;
  faceMatchConfidence: number | null;
  workingMinutes: number;
  status: AttendanceStatus;
  isOvertime: boolean;
  overtimeMinutes: number;
  isCorrected: boolean;
  correctionRequest: CorrectionRequest | null;
}

export interface ListAttendanceQuery {
  page?: number;
  limit?: number;
  employeeId?: string;
  departmentId?: string;
  status?: AttendanceStatus;
  from?: string;
  to?: string;
  hasPendingCorrection?: boolean;
}

export interface CorrectAttendanceInput {
  checkInAt?: string;
  checkOutAt?: string;
  status?: AttendanceStatus;
  reason: string;
}

export interface ManualAttendanceInput {
  employeeId: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: AttendanceStatus;
  reason: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
  id: string;
  name: string;
  defaultAnnualQuota: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

export interface Leave {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  managerComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
}

export interface ApplyLeaveInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ListLeavesQuery {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LeaveStatus;
}

export interface Allowances {
  hra?: number;
  transport?: number;
  medical?: number;
  other?: number;
}

export interface Deductions {
  pf?: number;
  tax?: number;
  other?: number;
}

export interface Salary {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  baseSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  currency: string;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryInput {
  employeeId: string;
  baseSalary: number;
  allowances?: Allowances;
  deductions?: Deductions;
  currency?: string;
  effectiveFrom: string;
}

export type UpdateSalaryInput = Partial<Omit<CreateSalaryInput, 'employeeId'>>;

export interface ListSalariesQuery {
  employeeId?: string;
  page?: number;
  limit?: number;
}

export type PayslipStatus = 'draft' | 'generated' | 'released';

export interface Payslip {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  salaryId: string;
  month: string;
  grossPay: number;
  netPay: number;
  latePenalty: number;
  overtimePay: number;
  bonus: number;
  status: PayslipStatus;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPayslipsQuery {
  month?: string;
  departmentId?: string;
  employeeId?: string;
  status?: PayslipStatus;
  page?: number;
  limit?: number;
}

export type PayrollRunStatus = 'processing' | 'completed' | 'failed';

export interface PayrollRunFailure {
  employeeId: string;
  message: string;
}

export interface PayrollRunRecord {
  runId: string;
  month: string;
  departmentId?: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: PayrollRunFailure[];
  startedAt: string;
  completedAt: string | null;
}

export interface RunPayrollInput {
  month: string;
  departmentId?: string;
}

export type NotificationType =
  'attendance' | 'leave' | 'salary' | 'shift' | 'holiday' | 'birthday' | 'announcement';

export interface Notification {
  id: string;
  recipientId: string | null;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface ListMyNotificationsQuery {
  unread?: boolean;
  page?: number;
  limit?: number;
}

export interface BroadcastInput {
  title: string;
  body: string;
  type?: NotificationType;
  departmentId?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export type GeofenceType = 'building' | 'floor' | 'room';

export interface Geofence {
  id: string;
  branchName: string;
  center: GeoPoint;
  radiusMeters: number;
  isActive: boolean;
  type: GeofenceType;
  parentId: string | null;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceInput {
  branchName: string;
  type?: GeofenceType;
  parentId?: string;
  capacity?: number;
  center?: GeoPoint;
  radiusMeters?: number;
}

export type UpdateGeofenceInput = Partial<
  Omit<CreateGeofenceInput, 'type' | 'parentId'> & { isActive: boolean }
>;

export interface OfficeSummary {
  officeId: string;
  assigned: number;
  attendanceRate: number;
}

export interface QrCode {
  id: string;
  geofenceId: string;
  validFrom: string;
  validTo: string;
  isUsed: boolean;
  singleUse: boolean;
  generatedBy: string;
  createdAt: string;
  token: string;
  qrImageDataUrl: string;
}

export interface GenerateQrInput {
  geofenceId: string;
  validForMinutes?: number;
  singleUse?: boolean;
}

export type QrCodeState = 'active' | 'expired' | 'revoked';

export interface QrCodeLifecycleRow {
  id: string;
  code: string;
  office: string;
  issued: string;
  scans: number;
  state: QrCodeState;
}

export type ShiftType = 'morning' | 'night' | 'rotational' | 'flexible';

export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftInput {
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
}

export type UpdateShiftInput = Partial<CreateShiftInput & { isActive: boolean }>;

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shift: Shift;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface AssignShiftInput {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
}

export interface RosterEmployee {
  employee: EmployeeSummary;
  departmentId: string;
  assignments: Array<{ shift: Shift; effectiveFrom: string; effectiveTo: string | null }>;
}

export interface ListRosterQuery {
  from: string;
  to: string;
  departmentId?: string;
}

export type EmployeeDocumentType = 'id_proof' | 'resume' | 'offer_letter' | 'contract' | 'other';

export interface EmployeeDocument {
  id: string;
  type: EmployeeDocumentType;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
}

export interface ListEmployeesQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: EmploymentStatus;
  sortBy?: 'firstName' | 'lastName' | 'dateOfJoining' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface DashboardKpis {
  date: string;
  headcount: number;
  attendanceRate: number;
  lateRate: number;
  leaveRate: number;
  presentCount: number;
  lateCount: number;
  onLeaveCount: number;
}

export interface AttendanceTrendPoint {
  month: string;
  attendanceRate: number;
  lateRate: number;
}

export interface DepartmentComparison {
  departmentId: string;
  departmentName: string;
  headcount: number;
  attendanceRate: number;
  lateRate: number;
}


export type RiskTrend = 'increasing' | 'decreasing' | 'stable';

export interface LateRiskEmployee {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  riskScore: number;
  lateDays: number;
  workingDays: number;
  lateRate: number;
  trend: RiskTrend;
}

export interface AbsenteeismTrendPoint {
  month: string;
  absenteeismRate: number;
}

export interface AbsenteeismDriver {
  label: string;
  valuePp: number;
}

export interface DepartmentAbsenteeismRow {
  departmentId: string;
  departmentName: string;
  lastObservedRate: number;
  projectedRate: number;
  deltaPp: number;
  risk: 'low' | 'medium' | 'high';
}

export interface AbsenteeismForecast {
  history: AbsenteeismTrendPoint[];
  forecastMonth: string;
  forecastRate: number;
  confidenceIntervalPp: number;
  trendPpPerMonth: number;
  rSquared: number;
  backtestMaePp: number | null;
  drivers: AbsenteeismDriver[];
  departmentBreakdown: DepartmentAbsenteeismRow[];
  method: 'linear-regression';
}

export type AnomalyType =
  'location_anomaly' | 'duplicate_face' | 'overtime_outlier' | 'attendance_pattern_anomaly';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  employeeId: string;
  employeeName: string;
  relatedEmployeeId?: string;
  relatedEmployeeName?: string;
  detail: string;
  detectedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  employee?: EmployeeSummary;
}

// ---------- Audit Logs ----------

export type AuditResult = 'success' | 'failed' | 'blocked';

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  result: AuditResult;
  source: string;
  createdAt: string;
}

export interface ListAuditLogsQuery {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  result?: AuditResult;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ---------- Face Management ----------

export type FaceEnrollmentStatus = 'registered' | 'not_registered' | 're_enrollment_due';

export interface FaceEnrollmentRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  status: FaceEnrollmentStatus;
  enrolledAt: string | null;
  lastVerifiedAt: string | null;
}

export interface FaceEnrollmentStats {
  enrolled: number;
  notRegistered: number;
  reEnrollmentDue: number;
  verificationsToday: number;
}

// ---------- Users & Roles ----------

export interface ConsoleUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  accountClaimed: boolean;
  lastLoginAt: string | null;
  employeeName: string | null;
  createdAt: string;
}

export interface InviteUserInput {
  email: string;
  role: Exclude<Role, 'super_admin'>;
}

// ---------- Settings ----------

export interface WorkspaceSettings {
  attendanceRules: {
    lateGraceMinutes: number;
    autoMarkAbsentEnabled: boolean;
    requireGeofenceForGps: boolean;
    allowManualCheckIn: boolean;
  };
  leaveApprovals: {
    autoApproveUnderDays: number;
    requireManagerApproval: boolean;
    carryForwardEnabled: boolean;
  };
  aiAnalytics: {
    anomalyDetectionEnabled: boolean;
    absenteeismForecastingEnabled: boolean;
    lateRiskAlertsEnabled: boolean;
  };
  dataPayroll: {
    payrollCutoffDay: number;
    dataRetentionMonths: number;
    weeklyDigestEmail: boolean;
  };
  updatedAt: string;
}

export type UpdateSettingsInput = Partial<{
  attendanceRules: Partial<WorkspaceSettings['attendanceRules']>;
  leaveApprovals: Partial<WorkspaceSettings['leaveApprovals']>;
  aiAnalytics: Partial<WorkspaceSettings['aiAnalytics']>;
  dataPayroll: Partial<WorkspaceSettings['dataPayroll']>;
}>;
