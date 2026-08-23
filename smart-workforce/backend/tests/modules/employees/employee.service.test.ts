import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('../../../src/modules/employees/document.model', () => ({
  EmployeeDocument: { create: jest.fn(), find: jest.fn() },
}));

jest.mock('../../../src/modules/departments/department.model', () => ({
  Department: { findOne: jest.fn() },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    hashPassword: jest.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
  },
}));

jest.mock('../../../src/shared/counter/counter.service', () => ({
  nextSequence: jest.fn(),
}));

jest.mock('../../../src/shared/services/fileUpload.service', () => ({
  uploadBuffer: jest.fn(),
}));

import { Department } from '../../../src/modules/departments/department.model';
import { EmployeeDocument } from '../../../src/modules/employees/document.model';
import { Employee } from '../../../src/modules/employees/employee.model';
import { employeeService } from '../../../src/modules/employees/employee.service';
import { nextSequence } from '../../../src/shared/counter/counter.service';
import type { ActorContext } from '../../../src/shared/types/actorContext';
import { uploadBuffer } from '../../../src/shared/services/fileUpload.service';
import { User } from '../../../src/modules/users/user.model';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedEmployeeFindOne = Employee.findOne as unknown as jest.Mock;
const mockedEmployeeFindById = Employee.findById as unknown as jest.Mock;
const mockedEmployeeCreate = Employee.create as unknown as jest.Mock;
const mockedEmployeeCount = Employee.countDocuments as unknown as jest.Mock;
const mockedEmployeeExists = Employee.exists as unknown as jest.Mock;
const mockedDocCreate = EmployeeDocument.create as unknown as jest.Mock;
const mockedDocFind = EmployeeDocument.find as unknown as jest.Mock;
const mockedDepartmentFindOne = Department.findOne as unknown as jest.Mock;
const mockedUserFindOne = User.findOne as unknown as jest.Mock;
const mockedUserCreate = User.create as unknown as jest.Mock;
const mockedUserFindByIdAndUpdate = User.findByIdAndUpdate as unknown as jest.Mock;
const mockedNextSequence = nextSequence as unknown as jest.Mock;
const mockedUploadBuffer = uploadBuffer as unknown as jest.Mock;

const superAdmin: ActorContext = { id: 'user-admin', role: 'super_admin' };
const hr: ActorContext = { id: 'user-hr', role: 'hr' };
const manager: ActorContext = { id: 'user-mgr', role: 'manager', employeeId: 'mgr-1' };
const self: ActorContext = { id: 'user-1', role: 'employee', employeeId: 'emp-1' };
const otherEmployee: ActorContext = { id: 'user-2', role: 'employee', employeeId: 'emp-2' };

function createFakeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    employeeCode: 'ENG-0001',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+919876543210',
    profileImageUrl: null as string | null,
    departmentId: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
    designation: 'Engineer',
    managerId: null as { id: string } | null,
    userId: { id: 'user-1', email: 'jane@acme.com', role: 'employee', isActive: true },
    dateOfJoining: new Date('2026-01-01'),
    employmentStatus: 'active',
    emergencyContact: {},
    address: {},
    isDeleted: false,
    deletedAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(function save(this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('employeeService.createEmployee', () => {
  const validInput = {
    email: 'new@acme.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+919876543210',
    departmentId: 'dept-1',
    designation: 'Engineer',
    dateOfJoining: new Date('2026-01-01'),
  };

  it('creates the user + employee with the account left unclaimed (no usable password set here)', async () => {
    mockedDepartmentFindOne.mockReturnValue(mockQuery({ code: 'ENG' }));
    mockedUserFindOne.mockReturnValue(mockQuery(null));
    mockedNextSequence.mockResolvedValue(1);
    mockedUserCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );
    mockedEmployeeCreate.mockResolvedValue({ id: 'emp-1' });
    mockedEmployeeFindById.mockReturnValue(mockQuery(createFakeEmployee()));

    const dto = await employeeService.createEmployee(validInput, hr);

    expect(dto.employeeCode).toBe('ENG-0001');
    expect(dto.email).toBe('jane@acme.com');
    expect(mockedUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ accountClaimed: false }),
    );
    expect(mockedEmployeeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', employeeCode: 'ENG-0001' }),
    );
  });

  it('rejects when the department does not exist or is inactive', async () => {
    mockedDepartmentFindOne.mockReturnValue(mockQuery(null));

    await expect(employeeService.createEmployee(validInput, hr)).rejects.toMatchObject({
      code: 'DEPARTMENT_NOT_FOUND',
    });
    expect(mockedUserFindOne).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    mockedDepartmentFindOne.mockReturnValue(mockQuery({ code: 'ENG' }));
    mockedUserFindOne.mockReturnValue(mockQuery({ id: 'existing' }));

    await expect(employeeService.createEmployee(validInput, hr)).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });

  it('blocks HR from creating an employee with the hr role (privilege-escalation guard)', async () => {
    await expect(
      employeeService.createEmployee({ ...validInput, role: 'hr' }, hr),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ASSIGNABLE' });
    expect(mockedDepartmentFindOne).not.toHaveBeenCalled();
  });

  it('rejects an unknown manager', async () => {
    mockedDepartmentFindOne.mockReturnValue(mockQuery({ code: 'ENG' }));
    mockedEmployeeExists.mockResolvedValue(null);

    await expect(
      employeeService.createEmployee({ ...validInput, managerId: 'ghost' }, hr),
    ).rejects.toMatchObject({ code: 'MANAGER_NOT_FOUND' });
  });
});

describe('employeeService.getEmployee (view scoping)', () => {
  it('lets Super Admin and HR view anyone', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));
    await expect(employeeService.getEmployee('emp-1', superAdmin)).resolves.toMatchObject({
      id: 'emp-1',
    });

    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));
    await expect(employeeService.getEmployee('emp-1', hr)).resolves.toMatchObject({ id: 'emp-1' });
  });

  it('lets a Manager view their own direct report', async () => {
    mockedEmployeeFindOne.mockReturnValue(
      mockQuery(createFakeEmployee({ managerId: { id: 'mgr-1' } })),
    );
    await expect(employeeService.getEmployee('emp-1', manager)).resolves.toMatchObject({
      id: 'emp-1',
    });
  });

  it('blocks a Manager from viewing someone outside their team', async () => {
    mockedEmployeeFindOne.mockReturnValue(
      mockQuery(createFakeEmployee({ managerId: { id: 'someone-else' } })),
    );
    await expect(employeeService.getEmployee('emp-1', manager)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('lets an Employee view their own profile', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee({ id: 'emp-1' })));
    await expect(employeeService.getEmployee('emp-1', self)).resolves.toMatchObject({
      id: 'emp-1',
    });
  });

  it("blocks an Employee from viewing someone else's profile", async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee({ id: 'emp-1' })));
    await expect(employeeService.getEmployee('emp-1', otherEmployee)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('404s for a missing/deleted employee', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(null));
    await expect(employeeService.getEmployee('ghost', superAdmin)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('employeeService.listEmployees', () => {
  const baseQuery = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt' as const,
    order: 'desc' as const,
  };

  it('blocks the employee role outright', async () => {
    await expect(employeeService.listEmployees(baseQuery, self)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it("scopes a Manager's query to their own team", async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([createFakeEmployee()]));
    mockedEmployeeCount.mockResolvedValue(1);

    await employeeService.listEmployees(baseQuery, manager);

    expect(mockedEmployeeFind).toHaveBeenCalledWith(
      expect.objectContaining({ managerId: 'mgr-1' }),
    );
  });

  it('rejects a Manager whose account has no linked employee profile', async () => {
    const managerNoProfile: ActorContext = { id: 'user-mgr', role: 'manager' };
    await expect(employeeService.listEmployees(baseQuery, managerNoProfile)).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });

  it('returns pagination metadata for HR', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([createFakeEmployee(), createFakeEmployee()]));
    mockedEmployeeCount.mockResolvedValue(45);

    const result = await employeeService.listEmployees({ ...baseQuery, limit: 20 }, hr);

    expect(result.total).toBe(45);
    expect(result.pages).toBe(3);
    expect(result.items).toHaveLength(2);
  });
});

describe('employeeService.updateEmployee', () => {
  it('lets HR update any field', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));
    mockedEmployeeFindById.mockReturnValue(mockQuery(createFakeEmployee({ designation: 'Lead' })));

    const dto = await employeeService.updateEmployee('emp-1', { designation: 'Lead' }, hr);
    expect(dto.designation).toBe('Lead');
  });

  it('lets an Employee update an allowed self field (phone)', async () => {
    const fakeEmployee = createFakeEmployee();
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));
    mockedEmployeeFindById.mockReturnValue(
      mockQuery(createFakeEmployee({ phone: '+911111111111' })),
    );

    await employeeService.updateEmployee('emp-1', { phone: '+911111111111' }, self);
    expect(fakeEmployee.save).toHaveBeenCalledTimes(1);
  });

  it('blocks an Employee from updating a disallowed field (departmentId)', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));

    await expect(
      employeeService.updateEmployee('emp-1', { departmentId: 'dept-2' }, self),
    ).rejects.toMatchObject({ code: 'FIELD_NOT_EDITABLE' });
  });

  it('blocks a Manager from updating anyone (read-only role)', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));

    await expect(
      employeeService.updateEmployee('emp-1', { designation: 'Lead' }, manager),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('blocks an Employee from updating a different employee', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee({ id: 'emp-1' })));

    await expect(
      employeeService.updateEmployee('emp-1', { phone: '+911111111111' }, otherEmployee),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('employeeService.deleteEmployee', () => {
  it('soft-deletes the employee and deactivates the linked login', async () => {
    const fakeEmployee = createFakeEmployee();
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));

    await employeeService.deleteEmployee('emp-1');

    expect(fakeEmployee.isDeleted).toBe(true);
    expect(fakeEmployee.employmentStatus).toBe('terminated');
    expect(mockedUserFindByIdAndUpdate).toHaveBeenCalledWith(
      fakeEmployee.userId,
      expect.objectContaining({ isActive: false }),
    );
  });

  it('404s for a missing employee', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(null));
    await expect(employeeService.deleteEmployee('ghost')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('employeeService.uploadProfileImage / uploadDocument', () => {
  const file = { buffer: Buffer.from('fake'), mimetype: 'image/png', originalname: 'photo.png' };

  it('uploads to Cloudinary and updates profileImageUrl', async () => {
    const fakeEmployee = createFakeEmployee();
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));
    mockedUploadBuffer.mockResolvedValue({ url: 'https://cdn/photo.png', publicId: 'x' });

    const result = await employeeService.uploadProfileImage('emp-1', file, hr);

    expect(result.profileImageUrl).toBe('https://cdn/photo.png');
    expect(fakeEmployee.profileImageUrl).toBe('https://cdn/photo.png');
    expect(mockedUploadBuffer).toHaveBeenCalledWith(
      file.buffer,
      'employees/emp-1/profile',
      expect.objectContaining({ resourceType: 'image' }),
    );
  });

  it('blocks a Manager from uploading a profile image (read-only role)', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));
    await expect(employeeService.uploadProfileImage('emp-1', file, manager)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('creates an EmployeeDocument record on document upload', async () => {
    mockedEmployeeFindOne.mockReturnValue(mockQuery(createFakeEmployee()));
    mockedUploadBuffer.mockResolvedValue({ url: 'https://cdn/doc.pdf', publicId: 'y' });
    mockedDocCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'doc-1', uploadedAt: new Date(), ...data }),
    );

    const doc = await employeeService.uploadDocument(
      'emp-1',
      { ...file, mimetype: 'application/pdf', originalname: 'id.pdf' },
      'id_proof',
      hr,
    );

    expect(doc.fileUrl).toBe('https://cdn/doc.pdf');
    expect(mockedDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', type: 'id_proof' }),
    );
  });
});

describe('employeeService.listDocuments', () => {
  it('applies the same view-scoping rules as getEmployee', async () => {
    mockedEmployeeFindOne.mockReturnValue(
      mockQuery(createFakeEmployee({ managerId: { id: 'someone-else' } })),
    );
    mockedDocFind.mockReturnValue(mockQuery([]));

    await expect(employeeService.listDocuments('emp-1', manager)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
