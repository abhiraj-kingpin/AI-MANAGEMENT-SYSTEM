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
