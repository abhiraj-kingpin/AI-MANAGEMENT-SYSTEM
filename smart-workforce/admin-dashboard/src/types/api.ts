
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
  phone: string;
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  designation: string;
  manager: EmployeeSummary | null;
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
}

export interface CorrectAttendanceInput {
  checkInAt?: string;
  checkOutAt?: string;
  status?: AttendanceStatus;
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

export interface Geofence {
  id: string;
  branchName: string;
  center: GeoPoint;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceInput {
  branchName: string;
  center: GeoPoint;
  radiusMeters?: number;
}

export type UpdateGeofenceInput = Partial<CreateGeofenceInput & { isActive: boolean }>;

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

export interface AbsenteeismForecast {
  history: AbsenteeismTrendPoint[];
  forecastMonth: string;
  forecastRate: number;
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
