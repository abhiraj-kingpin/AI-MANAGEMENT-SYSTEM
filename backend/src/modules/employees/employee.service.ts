import { AppError } from '../../shared/errors/AppError';
import { nextSequence } from '../../shared/counter/counter.service';
import { uploadBuffer } from '../../shared/services/fileUpload.service';
import type { ActorContext } from '../../shared/types/actorContext';
import type { PaginatedResult } from '../../shared/types/pagination';
import { assertRoleAssignable } from '../../shared/utils/roleAssignment';
import { escapeRegExp } from '../../shared/utils/regex';
import { generateRandomToken } from '../../shared/utils/tokens';
import { Department } from '../departments/department.model';
import { User } from '../users/user.model';
import { type EmployeeDocumentType, EmployeeDocument } from './document.model';
import { Employee } from './employee.model';
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from './employee.validators';
import {
  type EmployeeDTO,
  type EmployeeSummaryDTO,
  type PopulatedEmployeeLike,
  toEmployeeDTO,
  toEmployeeSummaryDTO,
} from './employee.types';

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

// Employees editing their own profile may only touch these — everything
// else (department, designation, employment status, ...) is HR/Admin-only.
// See docs/architecture/07-authentication-flow.md §6.
const SELF_EDITABLE_FIELDS = new Set(['phone', 'address', 'emergencyContact']);

const POPULATE_OPTIONS = [
  { path: 'departmentId', select: 'name code' },
  { path: 'managerId', select: 'employeeCode firstName lastName' },
  { path: 'userId', select: 'email role isActive' },
];

function toDTO(doc: unknown): EmployeeDTO {
  return toEmployeeDTO(doc as PopulatedEmployeeLike);
}

async function assertDepartmentExists(departmentId: string): Promise<{ code: string }> {
  const department = await Department.findOne({ _id: departmentId, isActive: true }).select('code');
  if (!department) {
    throw AppError.badRequest('Department not found or inactive.', 'DEPARTMENT_NOT_FOUND');
  }
  return { code: department.code };
}

async function assertManagerExists(managerId: string): Promise<void> {
  const exists = await Employee.exists({ _id: managerId, isDeleted: false });
  if (!exists) {
    throw AppError.badRequest('Manager not found.', 'MANAGER_NOT_FOUND');
  }
}

/** Read access: Super Admin/HR see everyone, a Manager sees their direct reports, an Employee sees only themself. */
function assertCanView(
  actor: ActorContext,
  employee: { id: string; managerId: { id: string } | null },
): void {
  if (actor.role === 'super_admin' || actor.role === 'hr') return;
  if (actor.role === 'manager' && employee.managerId?.id === actor.employeeId) return;
  if (actor.role === 'employee' && employee.id === actor.employeeId) return;
  throw AppError.forbidden('You do not have permission to access this employee.', 'FORBIDDEN');
}

/** Write access: only HR/Admin (full) or the employee themself (self, field-limited) — Managers are read-only. */
function assertCanEdit(actor: ActorContext, employee: { id: string }): 'full' | 'self' {
  if (actor.role === 'super_admin' || actor.role === 'hr') return 'full';
  if (actor.role === 'employee' && employee.id === actor.employeeId) return 'self';
  throw AppError.forbidden('You do not have permission to edit this employee.', 'FORBIDDEN');
}

export const employeeService = {
  async createEmployee(input: CreateEmployeeInput, actor: ActorContext): Promise<EmployeeDTO> {
    const role = input.role ?? 'employee';
    assertRoleAssignable(actor.role, role);

    const department = await assertDepartmentExists(input.departmentId);
    if (input.managerId) {
      await assertManagerExists(input.managerId);
    }

    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    // NOTE: no multi-document transaction here — a local single-node Mongo
    // (docker-compose) doesn't support them without being configured as a
    // replica set, which Atlas is by default in production. If Employee.create
    // fails after User.create succeeds, the User is orphaned; acceptable for
    // v1, flagged as a Phase 16/17 hardening item rather than silently ignored.
    const seq = await nextSequence(department.code);
    const employeeCode = `${department.code}-${String(seq).padStart(4, '0')}`;

    // No usable password is ever set here — `accountClaimed: false` blocks
    // login regardless of what this hash is (see auth.service.ts#login),
    // so it only needs to satisfy the schema's `required: true`, never to
    // be guessed or communicated. The employee sets their real password
    // themselves via POST /auth/claim-account, with this same email — see
    // User model's `accountClaimed` doc comment for why this replaced the
    // old generate-and-email-a-temporary-password flow.
    const passwordHash = await User.hashPassword(generateRandomToken(24));
    const user = await User.create({
      email: input.email,
      passwordHash,
      role,
      accountClaimed: false,
    });

    const employee = await Employee.create({
      userId: user.id,
      employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      departmentId: input.departmentId,
      designation: input.designation,
      managerId: input.managerId ?? null,
      dateOfJoining: input.dateOfJoining,
      emergencyContact: input.emergencyContact,
      address: input.address,
    });

    const populated = await Employee.findById(employee.id).populate(POPULATE_OPTIONS);
    return toDTO(populated);
  },

  async getEmployee(employeeId: string, actor: ActorContext): Promise<EmployeeDTO> {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false }).populate(
      POPULATE_OPTIONS,
    );
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }

    const managerId = employee.managerId as unknown as { id: string } | null;
    assertCanView(actor, { id: employee.id as string, managerId });

    return toDTO(employee);
  },

  async listEmployees(
    query: ListEmployeesQuery,
    actor: ActorContext,
  ): Promise<PaginatedResult<EmployeeDTO>> {
    if (actor.role === 'employee') {
      throw AppError.forbidden('You do not have permission to list employees.', 'FORBIDDEN');
    }

    const filter: Record<string, unknown> = { isDeleted: false };
    if (actor.role === 'manager') {
      if (!actor.employeeId) {
        throw AppError.forbidden(
          'Your account is not linked to an employee profile.',
          'NO_EMPLOYEE_PROFILE',
        );
      }
      filter.managerId = actor.employeeId;
    }
    if (query.department) filter.departmentId = query.department;
    if (query.status) filter.employmentStatus = query.status;
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const sortOrder = query.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Employee.find(filter)
        .populate(POPULATE_OPTIONS)
        .sort({ [query.sortBy]: sortOrder })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Employee.countDocuments(filter),
    ]);

    return {
      items: items.map((item) => toDTO(item)),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async searchEmployees(q: string, actor: ActorContext): Promise<EmployeeSummaryDTO[]> {
    if (actor.role === 'employee') {
      throw AppError.forbidden('You do not have permission to search employees.', 'FORBIDDEN');
    }

    const regex = new RegExp(escapeRegExp(q.trim()), 'i');
    const filter: Record<string, unknown> = {
      isDeleted: false,
      $or: [{ firstName: regex }, { lastName: regex }, { employeeCode: regex }],
    };
    if (actor.role === 'manager') {
      if (!actor.employeeId) return [];
      filter.managerId = actor.employeeId;
    }

    const employees = await Employee.find(filter)
      .limit(10)
      .select('employeeCode firstName lastName');

    return employees.map((e) =>
      toEmployeeSummaryDTO({
        id: e.id as string,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
      }),
    );
  },

  async updateEmployee(
    employeeId: string,
    updates: UpdateEmployeeInput,
    actor: ActorContext,
  ): Promise<EmployeeDTO> {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }

    const scope = assertCanEdit(actor, { id: employee.id as string });
    if (scope === 'self') {
      const disallowed = Object.keys(updates).filter((key) => !SELF_EDITABLE_FIELDS.has(key));
      if (disallowed.length > 0) {
        throw AppError.forbidden(
          `You can only update: ${[...SELF_EDITABLE_FIELDS].join(', ')}.`,
          'FIELD_NOT_EDITABLE',
        );
      }
    }

    if (updates.departmentId) {
      await assertDepartmentExists(updates.departmentId);
    }
    if (updates.managerId) {
      await assertManagerExists(updates.managerId);
    }

    Object.assign(employee, updates);
    await employee.save();

    const populated = await Employee.findById(employee.id).populate(POPULATE_OPTIONS);
    return toDTO(populated);
  },

  /** Soft-delete + deactivate the linked login — route-gated to Super Admin/HR (see employee.routes.ts). */
  async deleteEmployee(employeeId: string): Promise<void> {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }

    employee.isDeleted = true;
    employee.deletedAt = new Date();
    employee.employmentStatus = 'terminated';
    await employee.save();

    await User.findByIdAndUpdate(employee.userId, {
      isActive: false,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  },

  async uploadProfileImage(
    employeeId: string,
    file: UploadedFile,
    actor: ActorContext,
  ): Promise<{ profileImageUrl: string }> {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }
    assertCanEdit(actor, { id: employee.id as string });

    const result = await uploadBuffer(file.buffer, `employees/${employeeId}/profile`, {
      resourceType: 'image',
    });
    employee.profileImageUrl = result.url;
    await employee.save();

    return { profileImageUrl: result.url };
  },

  async uploadDocument(
    employeeId: string,
    file: UploadedFile,
    type: EmployeeDocumentType,
    actor: ActorContext,
  ) {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }
    assertCanEdit(actor, { id: employee.id as string });

    const result = await uploadBuffer(file.buffer, `employees/${employeeId}/documents`, {
      resourceType: 'auto',
    });
    const doc = await EmployeeDocument.create({
      employeeId,
      type,
      fileUrl: result.url,
      fileName: file.originalname,
    });

    return {
      id: doc.id as string,
      type: doc.type,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    };
  },

  async listDocuments(employeeId: string, actor: ActorContext) {
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false }).populate({
      path: 'managerId',
      select: 'employeeCode firstName lastName',
    });
    if (!employee) {
      throw AppError.notFound('Employee not found.');
    }
    const managerId = employee.managerId as unknown as { id: string } | null;
    assertCanView(actor, { id: employee.id as string, managerId });

    const docs = await EmployeeDocument.find({ employeeId }).sort({ uploadedAt: -1 });
    return docs.map((d) => ({
      id: d.id as string,
      type: d.type,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt,
    }));
  },
};
