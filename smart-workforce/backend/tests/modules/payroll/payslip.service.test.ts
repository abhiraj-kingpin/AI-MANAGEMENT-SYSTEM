import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/payroll/salary.model', () => ({
  Salary: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock('../../../src/modules/payroll/payslip.model', () => ({
  Payslip: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('../../../src/modules/attendance/attendance.model', () => ({
  Attendance: { find: jest.fn() },
}));
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn(), findById: jest.fn() },
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notify: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/modules/audit/audit.service', () => ({
  recordAudit: jest.fn(() => Promise.resolve()),
}));

import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { Employee } from '../../../src/modules/employees/employee.model';
import { notify } from '../../../src/modules/notifications/notification.service';
import { Payslip } from '../../../src/modules/payroll/payslip.model';
import {
  generatePayslipForEmployee,
  payslipService,
} from '../../../src/modules/payroll/payslip.service';
import { Salary } from '../../../src/modules/payroll/salary.model';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedSalaryFindOne = Salary.findOne as unknown as jest.Mock;
const mockedSalaryFindById = Salary.findById as unknown as jest.Mock;
const mockedPayslipCreate = Payslip.create as unknown as jest.Mock;
const mockedPayslipFindOne = Payslip.findOne as unknown as jest.Mock;
const mockedPayslipFindById = Payslip.findById as unknown as jest.Mock;
const mockedPayslipFind = Payslip.find as unknown as jest.Mock;
const mockedPayslipCount = Payslip.countDocuments as unknown as jest.Mock;
const mockedAttendanceFind = Attendance.find as unknown as jest.Mock;
const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedEmployeeFindById = Employee.findById as unknown as jest.Mock;
const mockedNotify = notify as unknown as jest.Mock;

const EMPLOYEE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function fakeSalary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'salary-1',
    employeeId: EMPLOYEE_ID,
    baseSalary: 6448,
    allowances: { hra: 1000, transport: 500, medical: 300, other: 200 },
    deductions: { pf: 1000, tax: 500, other: 100 },
    currency: 'INR',
    ...overrides,
  };
}

function fakePayslip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payslip-1',
    employeeId: EMPLOYEE_ID,
    salaryId: 'salary-1',
    month: '2026-08',
    grossPay: 8541,
    netPay: 6795.4,
    latePenalty: 145.6,
    overtimePay: 93,
    bonus: 0,
    status: 'generated',
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

function attendanceRecord(status: string, overtimeMinutes = 0) {
  return { status, overtimeMinutes };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedEmployeeFind.mockReturnValue(mockQuery([]));
});

describe('generatePayslipForEmployee', () => {
  it('rejects an employee with no salary record', async () => {
    mockedSalaryFindOne.mockResolvedValue(null);
    await expect(generatePayslipForEmployee(EMPLOYEE_ID, '2026-08')).rejects.toMatchObject({
      code: 'NO_SALARY_RECORD',
    });
  });

  it('skips (does not recompute) an already-released payslip', async () => {
    mockedSalaryFindOne.mockResolvedValue(fakeSalary());
    mockedPayslipFindOne.mockResolvedValue(fakePayslip({ status: 'released' }));

    const result = await generatePayslipForEmployee(EMPLOYEE_ID, '2026-08');

    expect(result.outcome).toBe('skipped');
    expect(mockedAttendanceFind).not.toHaveBeenCalled();
    expect(mockedPayslipCreate).not.toHaveBeenCalled();
  });

  it('computes grossPay/netPay/overtimePay/latePenalty from real attendance data', async () => {
    mockedSalaryFindOne.mockResolvedValue(fakeSalary());
    mockedPayslipFindOne.mockResolvedValue(null);
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        attendanceRecord('present'),
        attendanceRecord('late'),
        attendanceRecord('late'),
        attendanceRecord('half_day'),
        attendanceRecord('present', 120),
      ]),
    );
    mockedPayslipCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakePayslip(data)),
    );

    const result = await generatePayslipForEmployee(EMPLOYEE_ID, '2026-08');

    expect(result.outcome).toBe('created');
    expect(mockedPayslipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: EMPLOYEE_ID,
        month: '2026-08',
        overtimePay: 93,
        latePenalty: 145.6,
        grossPay: 8541,
        netPay: 6795.4,
        bonus: 0,
        status: 'generated',
      }),
    );
  });

  it('recomputes (updates in place) an existing draft/generated payslip for the same month', async () => {
    mockedSalaryFindOne.mockResolvedValue(fakeSalary());
    const existing = fakePayslip({ status: 'generated', overtimePay: 0, latePenalty: 0 });
    mockedPayslipFindOne.mockResolvedValue(existing);
    mockedAttendanceFind.mockReturnValue(mockQuery([]));

    const result = await generatePayslipForEmployee(EMPLOYEE_ID, '2026-08');

    expect(result.outcome).toBe('updated');
    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(mockedPayslipCreate).not.toHaveBeenCalled();
  });

  it('never pays negative net pay even if deductions exceed gross', async () => {
    mockedSalaryFindOne.mockResolvedValue(
      fakeSalary({ baseSalary: 100, allowances: {}, deductions: { pf: 500 } }),
    );
    mockedPayslipFindOne.mockResolvedValue(null);
    mockedAttendanceFind.mockReturnValue(mockQuery([]));
    mockedPayslipCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakePayslip(data)),
    );

    await generatePayslipForEmployee(EMPLOYEE_ID, '2026-08');

    expect(mockedPayslipCreate).toHaveBeenCalledWith(expect.objectContaining({ netPay: 0 }));
  });
});

describe('payslipService.list', () => {
  it("resolves a departmentId filter to that department's employee ids", async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }]));
    mockedPayslipFind.mockReturnValue(mockQuery([]));
    mockedPayslipCount.mockResolvedValue(0);

    await payslipService.list({ departmentId: 'dept-1', page: 1, limit: 20 });

    expect(mockedPayslipFind).toHaveBeenCalledWith({
      employeeId: { $in: ['emp-1', 'emp-2'] },
    });
  });

  it('an explicit employeeId filter takes precedence over departmentId', async () => {
    mockedPayslipFind.mockReturnValue(mockQuery([]));
    mockedPayslipCount.mockResolvedValue(0);

    await payslipService.list({ employeeId: EMPLOYEE_ID, page: 1, limit: 20 });

    expect(mockedPayslipFind).toHaveBeenCalledWith({ employeeId: EMPLOYEE_ID });
  });

  it('attaches each row employee name/code from a single batch lookup', async () => {
    mockedPayslipFind.mockReturnValue(mockQuery([fakePayslip()]));
    mockedPayslipCount.mockResolvedValue(1);
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: EMPLOYEE_ID, employeeCode: 'EMP-001', firstName: 'Priya', lastName: 'Nair' },
      ]),
    );

    const result = await payslipService.list({ page: 1, limit: 20 });

    expect(result.items[0].employee).toEqual({
      id: EMPLOYEE_ID,
      employeeCode: 'EMP-001',
      firstName: 'Priya',
      lastName: 'Nair',
    });
  });
});

describe('payslipService.getMyPayslips', () => {
  it('rejects an actor with no linked employee profile', async () => {
    const actor: ActorContext = { id: 'user-x', role: 'employee' };
    await expect(payslipService.getMyPayslips(actor)).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });

  it('only ever returns released payslips, even if drafts/generated ones exist', async () => {
    mockedPayslipFind.mockReturnValue(mockQuery([fakePayslip({ status: 'released' })]));
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    await payslipService.getMyPayslips(actor);

    expect(mockedPayslipFind).toHaveBeenCalledWith({
      employeeId: EMPLOYEE_ID,
      status: 'released',
    });
  });

  it("never attaches an employee ref to the caller's own /me history", async () => {
    mockedPayslipFind.mockReturnValue(mockQuery([fakePayslip({ status: 'released' })]));
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    const [payslip] = await payslipService.getMyPayslips(actor);

    expect(payslip.employee).toBeUndefined();
  });
});

describe('payslipService.release', () => {
  const hr: ActorContext = { id: 'user-hr', role: 'hr' };

  it('404s for a missing payslip', async () => {
    mockedPayslipFindById.mockResolvedValue(null);
    await expect(payslipService.release('ghost', hr)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects releasing an already-released payslip', async () => {
    mockedPayslipFindById.mockResolvedValue(fakePayslip({ status: 'released' }));
    await expect(payslipService.release('payslip-1', hr)).rejects.toMatchObject({
      code: 'ALREADY_RELEASED',
    });
  });

  it('rejects releasing a payslip still in draft', async () => {
    mockedPayslipFindById.mockResolvedValue(fakePayslip({ status: 'draft' }));
    await expect(payslipService.release('payslip-1', hr)).rejects.toMatchObject({
      code: 'PAYSLIP_NOT_GENERATED',
    });
  });

  it('releases a generated payslip', async () => {
    const payslip = fakePayslip({ status: 'generated' });
    mockedPayslipFindById.mockResolvedValue(payslip);

    const dto = await payslipService.release('payslip-1', hr);

    expect(payslip.status).toBe('released');
    expect(dto.status).toBe('released');
    expect(mockedNotify).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      expect.any(String),
      expect.stringContaining(payslip.month),
      'salary',
      expect.any(Object),
    );
  });
});

describe('payslipService.getForDownload', () => {
  it('404s for a missing payslip', async () => {
    mockedPayslipFindById.mockResolvedValue(null);
    await expect(
      payslipService.getForDownload('ghost', { id: 'user-hr', role: 'hr' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lets HR download regardless of status', async () => {
    mockedPayslipFindById.mockResolvedValue(fakePayslip({ status: 'draft' }));
    mockedSalaryFindById.mockResolvedValue(fakeSalary());

    const { payslip } = await payslipService.getForDownload('payslip-1', {
      id: 'user-hr',
      role: 'hr',
    });
    expect(payslip.status).toBe('draft');
  });

  it("rejects an employee downloading someone else's payslip", async () => {
    mockedPayslipFindById.mockResolvedValue(fakePayslip({ employeeId: 'someone-else' }));
    await expect(
      payslipService.getForDownload('payslip-1', {
        id: 'user-1',
        role: 'employee',
        employeeId: EMPLOYEE_ID,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects an employee downloading their own payslip before it is released', async () => {
    mockedPayslipFindById.mockResolvedValue(
      fakePayslip({ employeeId: EMPLOYEE_ID, status: 'generated' }),
    );
    await expect(
      payslipService.getForDownload('payslip-1', {
        id: 'user-1',
        role: 'employee',
        employeeId: EMPLOYEE_ID,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets an employee download their own released payslip', async () => {
    mockedPayslipFindById.mockResolvedValue(
      fakePayslip({ employeeId: EMPLOYEE_ID, status: 'released' }),
    );
    mockedSalaryFindById.mockResolvedValue(fakeSalary());

    const { payslip } = await payslipService.getForDownload('payslip-1', {
      id: 'user-1',
      role: 'employee',
      employeeId: EMPLOYEE_ID,
    });
    expect(payslip.status).toBe('released');
  });
});

describe('payslipService.renderPdf', () => {
  it('produces a non-empty PDF buffer', async () => {
    mockedEmployeeFindById.mockReturnValue(
      mockQuery({ employeeCode: 'EMP-001', firstName: 'Asha', lastName: 'Rao' }),
    );

    const buffer = await payslipService.renderPdf(fakePayslip() as never, fakeSalary() as never);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
