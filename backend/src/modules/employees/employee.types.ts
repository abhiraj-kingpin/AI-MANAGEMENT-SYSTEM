import type { Role } from '../../shared/constants/roles';
import type { Address, EmergencyContact, EmploymentStatus } from './employee.model';

/**
 * Canonical "employee summary" shape — reused by the auth module (login/me
 * responses) and anywhere else that needs a lightweight reference (e.g. a
 * manager's name on a team member's record) without the full profile.
 */
export interface EmployeeSummaryDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface EmployeeDTO extends EmployeeSummaryDTO {
  email: string;
  role: Role;
  isActive: boolean;
  phone: string;
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  designation: string;
  manager: EmployeeSummaryDTO | null;
  dateOfJoining: Date;
  employmentStatus: EmploymentStatus;
  emergencyContact: EmergencyContact;
  address: Address;
  // bankDetails is intentionally never included in this DTO — it's sensitive
  // financial data that only the payroll module (Phase 11) needs to read
  // directly off the document, not something surfaced via employee GETs.
  createdAt: Date;
  updatedAt: Date;
}

/** Shape of an Employee doc after `.populate('userId').populate('departmentId').populate('managerId')`. */
export interface PopulatedEmployeeLike {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileImageUrl: string | null;
  designation: string;
  dateOfJoining: Date;
  employmentStatus: EmploymentStatus;
  emergencyContact: EmergencyContact;
  address: Address;
  createdAt: Date;
  updatedAt: Date;
  departmentId: { id: string; name: string; code: string } | null;
  managerId: { id: string; employeeCode: string; firstName: string; lastName: string } | null;
  userId: { id: string; email: string; role: Role; isActive: boolean } | null;
}

export function toEmployeeSummaryDTO(employee: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}): EmployeeSummaryDTO {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
  };
}

export function toEmployeeDTO(employee: PopulatedEmployeeLike): EmployeeDTO {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.userId?.email ?? '',
    role: employee.userId?.role ?? 'employee',
    isActive: employee.userId?.isActive ?? false,
    phone: employee.phone,
    profileImageUrl: employee.profileImageUrl,
    department: employee.departmentId,
    designation: employee.designation,
    manager: employee.managerId ? toEmployeeSummaryDTO(employee.managerId) : null,
    dateOfJoining: employee.dateOfJoining,
    employmentStatus: employee.employmentStatus,
    emergencyContact: employee.emergencyContact,
    address: employee.address,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}
