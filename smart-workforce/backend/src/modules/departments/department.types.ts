import type { EmployeeSummaryDTO } from '../employees/employee.types';

export interface DepartmentDTO {
  id: string;
  name: string;
  code: string;
  headOfDepartment: EmployeeSummaryDTO | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedDepartmentLike {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  headOfDepartment: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
}

export function toDepartmentDTO(department: PopulatedDepartmentLike): DepartmentDTO {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    headOfDepartment: department.headOfDepartment
      ? {
          id: department.headOfDepartment.id,
          employeeCode: department.headOfDepartment.employeeCode,
          firstName: department.headOfDepartment.firstName,
          lastName: department.headOfDepartment.lastName,
        }
      : null,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}
