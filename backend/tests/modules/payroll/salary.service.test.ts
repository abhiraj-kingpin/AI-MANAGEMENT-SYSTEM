import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/payroll/salary.model', () => ({
  Salary: { create: jest.fn(), find: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn() },
}));

import { Salary } from '../../../src/modules/payroll/salary.model';
import { salaryService } from '../../../src/modules/payroll/salary.service';

const mockedCreate = Salary.create as unknown as jest.Mock;
const mockedFind = Salary.find as unknown as jest.Mock;
const mockedFindOne = Salary.findOne as unknown as jest.Mock;
const mockedCount = Salary.countDocuments as unknown as jest.Mock;

const EMPLOYEE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function fakeSalary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'salary-1',
    employeeId: EMPLOYEE_ID,
    baseSalary: 50000,
    allowances: { hra: 5000 },
    deductions: { pf: 1800 },
    currency: 'INR',
    effectiveFrom: new Date('2026-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('salaryService.create', () => {
  it('rejects a duplicate employeeId', async () => {
    mockedFindOne.mockResolvedValue(fakeSalary());

    await expect(
      salaryService.create({
        employeeId: EMPLOYEE_ID,
        baseSalary: 50000,
        currency: 'INR',
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).rejects.toMatchObject({ code: 'SALARY_ALREADY_EXISTS' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates a salary record when none exists yet', async () => {
    mockedFindOne.mockResolvedValue(null);
    mockedCreate.mockResolvedValue(fakeSalary());

    const dto = await salaryService.create({
      employeeId: EMPLOYEE_ID,
      baseSalary: 50000,
      currency: 'INR',
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(dto.baseSalary).toBe(50000);
  });
});

describe('salaryService.update', () => {
  it('404s when the employee has no salary record yet', async () => {
    mockedFindOne.mockResolvedValue(null);
    await expect(salaryService.update(EMPLOYEE_ID, { baseSalary: 60000 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates baseSalary and merges partial allowances rather than replacing them', async () => {
    const fake = fakeSalary({ allowances: { hra: 5000, transport: 1000 } });
    mockedFindOne.mockResolvedValue(fake);

    const dto = await salaryService.update(EMPLOYEE_ID, {
      baseSalary: 60000,
      allowances: { hra: 6000 },
    });

    expect(fake.baseSalary).toBe(60000);
    expect(fake.allowances).toEqual({ hra: 6000, transport: 1000 }); // merged, not replaced
    expect(dto.baseSalary).toBe(60000);
  });
});

describe('salaryService.list', () => {
  it('filters by employeeId when given', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeSalary()]));
    mockedCount.mockResolvedValue(1);

    const result = await salaryService.list({ employeeId: EMPLOYEE_ID, page: 1, limit: 20 });

    expect(mockedFind).toHaveBeenCalledWith({ employeeId: EMPLOYEE_ID });
    expect(result.total).toBe(1);
  });

  it('returns every record when no filter is given', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeSalary(), fakeSalary()]));
    mockedCount.mockResolvedValue(2);

    const result = await salaryService.list({ page: 1, limit: 20 });

    expect(mockedFind).toHaveBeenCalledWith({});
    expect(result.items).toHaveLength(2);
  });
});
