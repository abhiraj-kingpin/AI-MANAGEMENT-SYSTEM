/**
 * Shared API contract types — hand-maintained mirror of
 * docs/architecture/04-api-documentation.md until an OpenAPI codegen step
 * (docs/api/openapi.yaml) replaces this file with generated types.
 */

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

/** `GET /departments` — see backend/README.md#departments-departments. */
export interface Department {
  id: string;
  name: string;
  code: string;
  headOfDepartment: EmployeeSummary | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /employees/:id`, list items — see backend/README.md#employees-employees. */
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

/** `GET /attendance` — see backend/README.md#attendance-attendance. `employee` is only ever present on this HR/Manager report, never on `/attendance/me`. */
export interface Attendance {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  method: AttendanceMethod;
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

/** `GET /leave-types` — see backend/README.md#leave-leaves-leave-types-holidays. */
export interface LeaveType {
  id: string;
  name: string;
  defaultAnnualQuota: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

/** `GET /leaves/balance` — one row per leave type, auto-allocated the instant it's read rather than requiring a separate seed step (see backend/README.md#leave-leaves-leave-types-holidays). */
export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

/** `GET /leaves`, `/leaves/me` — see backend/README.md#leave-leaves-leave-types-holidays. `employee` is only ever present on the HR/Manager review queue (`GET /leaves`), never on the self-service `/leaves/me` history. */
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

/** `GET/POST /salaries`, `PATCH /salaries/:employeeId` — see backend/README.md#payroll-salaries-payroll-payslips. `employee` is only ever present on the HR list (`GET /salaries`). */
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

/** `GET /payslips`, `/payslips/me` — see backend/README.md#payroll-salaries-payroll-payslips. `employee` is only ever present on the HR list (`GET /payslips`), never on the self-service `/me` history. */
export interface Payslip {
  id: string;
  employeeId: string;
  employee?: EmployeeSummary;
  salaryId: string;
  month: string; // "YYYY-MM"
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

/** `POST /payroll/run`, `GET /payroll/runs/:runId/status` — see backend/README.md#payroll-salaries-payroll-payslips. The run registry lives in the API process's memory, not a durable queue (documented backend limitation) — polling stops making sense across a server restart mid-run. */
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

export type ShiftType = 'morning' | 'night' | 'rotational' | 'flexible';

/** `GET /shifts` — see backend/README.md#shifts-shifts. */
export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string; // "HH:mm", 24-hour
  endTime: string; // "HH:mm", 24-hour
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

/** `GET /shifts/me`, `POST /shifts/assign` — see backend/README.md#shifts-shifts. */
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

/** `GET /analytics/dashboard` — see backend/README.md#analytics-analytics. `date` arrives as an ISO string over JSON, not a `Date`. */
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

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  employee?: EmployeeSummary;
}
