import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/departments/department.model', () => ({
  Department: { find: jest.fn(), findOne: jest.fn(), findById: jest.fn(), create: jest.fn() },
}));
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { exists: jest.fn() },
}));

import { departmentService } from '../../../src/modules/departments/department.service';
import { Department } from '../../../src/modules/departments/department.model';
import { Employee } from '../../../src/modules/employees/employee.model';

const mockedFind = Department.find as unknown as jest.Mock;
const mockedFindOne = Department.findOne as unknown as jest.Mock;
const mockedFindById = Department.findById as unknown as jest.Mock;
const mockedCreate = Department.create as unknown as jest.Mock;
const mockedEmployeeExists = Employee.exists as unknown as jest.Mock;

function fakeDepartment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    isActive: true,
    headOfDepartment: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('departmentService.list', () => {
  it('defaults to active-only departments, sorted by name', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeDepartment()]));

    await departmentService.list({});

    expect(mockedFind).toHaveBeenCalledWith({ isActive: true });
  });

  it('includes inactive departments when explicitly asked', async () => {
    mockedFind.mockReturnValue(mockQuery([]));

    await departmentService.list({ includeInactive: true });

    expect(mockedFind).toHaveBeenCalledWith({});
  });

  it('maps a populated head of department into a summary DTO', async () => {
    mockedFind.mockReturnValue(
      mockQuery([
        fakeDepartment({
          headOfDepartment: {
            id: 'emp-1',
            employeeCode: 'ENG-0001',
            firstName: 'Asha',
            lastName: 'Rao',
          },
        }),
      ]),
    );

    const [dept] = await departmentService.list({});

    expect(dept.headOfDepartment).toEqual({
      id: 'emp-1',
      employeeCode: 'ENG-0001',
      firstName: 'Asha',
      lastName: 'Rao',
    });
  });
});

describe('departmentService.create', () => {
  it('rejects a duplicate name or code', async () => {
    mockedFindOne.mockResolvedValue(fakeDepartment());

    await expect(
      departmentService.create({ name: 'Engineering', code: 'ENG2' }),
    ).rejects.toMatchObject({ code: 'DEPARTMENT_TAKEN' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('uppercases the code before checking uniqueness and creating', async () => {
    mockedFindOne.mockResolvedValue(null);
    mockedCreate.mockResolvedValue(fakeDepartment());
    mockedFindById.mockReturnValue(mockQuery(fakeDepartment()));

    await departmentService.create({ name: 'Sales', code: 'sal' });

    expect(mockedFindOne).toHaveBeenCalledWith({ $or: [{ name: 'Sales' }, { code: 'SAL' }] });
    expect(mockedCreate).toHaveBeenCalledWith({ name: 'Sales', code: 'SAL' });
  });

  it('rejects a headOfDepartment that is not a real employee', async () => {
    mockedFindOne.mockResolvedValue(null);
    mockedEmployeeExists.mockResolvedValue(false);

    await expect(
      departmentService.create({ name: 'Sales', code: 'SAL', headOfDepartment: 'ghost' }),
    ).rejects.toMatchObject({ code: 'EMPLOYEE_NOT_FOUND' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates successfully when the head of department is a real employee', async () => {
    mockedFindOne.mockResolvedValue(null);
    mockedEmployeeExists.mockResolvedValue(true);
    mockedCreate.mockResolvedValue(fakeDepartment({ id: 'dept-2', name: 'Sales', code: 'SAL' }));
    mockedFindById.mockReturnValue(
      mockQuery(fakeDepartment({ id: 'dept-2', name: 'Sales', code: 'SAL' })),
    );

    await expect(
      departmentService.create({ name: 'Sales', code: 'SAL', headOfDepartment: 'emp-1' }),
    ).resolves.toMatchObject({ name: 'Sales', code: 'SAL' });
  });
});

describe('departmentService.update', () => {
  it('404s for a missing department', async () => {
    mockedFindById.mockResolvedValueOnce(null);

    await expect(departmentService.update('ghost', { name: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects a headOfDepartment that is not a real employee', async () => {
    mockedFindById.mockResolvedValueOnce(fakeDepartment());
    mockedEmployeeExists.mockResolvedValue(false);

    await expect(
      departmentService.update('dept-1', { headOfDepartment: 'ghost' }),
    ).rejects.toMatchObject({ code: 'EMPLOYEE_NOT_FOUND' });
  });

  it('applies updates and uppercases a new code', async () => {
    const existing = fakeDepartment();
    mockedFindById
      .mockResolvedValueOnce(existing)
      .mockReturnValueOnce(mockQuery(fakeDepartment({ code: 'ENG2' })));

    await departmentService.update('dept-1', { code: 'eng2' });

    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(existing.code).toBe('ENG2');
  });

  it('allows clearing headOfDepartment to null without validating it', async () => {
    const existing = fakeDepartment({ headOfDepartment: 'old-head' });
    mockedFindById.mockResolvedValueOnce(existing).mockReturnValueOnce(mockQuery(fakeDepartment()));

    await departmentService.update('dept-1', { headOfDepartment: null });

    expect(mockedEmployeeExists).not.toHaveBeenCalled();
    expect(existing.headOfDepartment).toBeNull();
  });
});
