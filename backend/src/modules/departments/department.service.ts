import { AppError } from '../../shared/errors/AppError';
import { Employee } from '../employees/employee.model';
import { Department } from './department.model';
import {
  type DepartmentDTO,
  type PopulatedDepartmentLike,
  toDepartmentDTO,
} from './department.types';
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from './department.validators';

const POPULATE_HEAD = { path: 'headOfDepartment', select: 'employeeCode firstName lastName' };

async function assertHeadIsRealEmployee(employeeId: string): Promise<void> {
  const exists = await Employee.exists({ _id: employeeId, isDeleted: false });
  if (!exists) {
    throw AppError.badRequest(
      'Head of department must be an existing employee.',
      'EMPLOYEE_NOT_FOUND',
    );
  }
}

export const departmentService = {
  /** Open to any authenticated user — every department dropdown (filters, employee creation) needs this regardless of role; only writes are Super Admin/HR gated (see department.routes.ts). */
  async list(query: ListDepartmentsQuery): Promise<DepartmentDTO[]> {
    const filter = query.includeInactive ? {} : { isActive: true };
    const departments = await Department.find(filter).sort({ name: 1 }).populate(POPULATE_HEAD);
    return departments.map((d) => toDepartmentDTO(d as unknown as PopulatedDepartmentLike));
  },

  async create(input: CreateDepartmentInput): Promise<DepartmentDTO> {
    const code = input.code.toUpperCase();
    const existing = await Department.findOne({ $or: [{ name: input.name }, { code }] });
    if (existing) {
      throw AppError.conflict(
        'A department with this name or code already exists.',
        'DEPARTMENT_TAKEN',
      );
    }
    if (input.headOfDepartment) {
      await assertHeadIsRealEmployee(input.headOfDepartment);
    }

    const department = await Department.create({ ...input, code });
    const populated = await Department.findById(department.id).populate(POPULATE_HEAD);
    return toDepartmentDTO(populated as unknown as PopulatedDepartmentLike);
  },

  async update(departmentId: string, updates: UpdateDepartmentInput): Promise<DepartmentDTO> {
    const department = await Department.findById(departmentId);
    if (!department) {
      throw AppError.notFound('Department not found.');
    }
    if (updates.headOfDepartment) {
      await assertHeadIsRealEmployee(updates.headOfDepartment);
    }
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    Object.assign(department, updates);
    await department.save();

    const populated = await Department.findById(department.id).populate(POPULATE_HEAD);
    return toDepartmentDTO(populated as unknown as PopulatedDepartmentLike);
  },
};
