import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));
jest.mock('../../../src/modules/payroll/payslip.service', () => ({
  generatePayslipForEmployee: jest.fn(),
}));

import { Employee } from '../../../src/modules/employees/employee.model';
import { generatePayslipForEmployee } from '../../../src/modules/payroll/payslip.service';
import { payrollRunService } from '../../../src/modules/payroll/payrollRun.service';
import { AppError } from '../../../src/shared/errors/AppError';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedGenerate = generatePayslipForEmployee as unknown as jest.Mock;

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('payrollRunService.start / getStatus', () => {
  it('returns immediately with status "processing", without waiting for the batch to finish', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }]));
    mockedGenerate.mockImplementation(() => new Promise(() => {}));

    const run = await payrollRunService.start({ month: '2026-08' });

    expect(run.status).toBe('processing');
    expect(run.totalEmployees).toBe(2);
    expect(run.processed).toBe(0);
    expect(run.failed).toEqual([]);
    expect(run.completedAt).toBeNull();
    expect(payrollRunService.getStatus(run.runId)).toBe(run);
  });

  it('scopes the batch to a department when given', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    await payrollRunService.start({ month: '2026-08', departmentId: 'dept-1' });

    expect(mockedEmployeeFind).toHaveBeenCalledWith({ status: 'active', departmentId: 'dept-1' });
  });

  it('only ever queries active employees', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));
    await payrollRunService.start({ month: '2026-08' });
    expect(mockedEmployeeFind).toHaveBeenCalledWith({ status: 'active' });
  });

  it('completes the run and tallies created/updated/skipped once every employee is processed', async () => {
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }, { _id: 'emp-3' }]),
    );
    mockedGenerate
      .mockResolvedValueOnce({ outcome: 'created' })
      .mockResolvedValueOnce({ outcome: 'updated' })
      .mockResolvedValueOnce({ outcome: 'skipped' });

    const run = await payrollRunService.start({ month: '2026-08' });
    await flushAsync();

    const status = payrollRunService.getStatus(run.runId);
    expect(status?.status).toBe('completed');
    expect(status?.processed).toBe(3);
    expect(status?.created).toBe(1);
    expect(status?.updated).toBe(1);
    expect(status?.skipped).toBe(1);
    expect(status?.failed).toEqual([]);
    expect(status?.completedAt).not.toBeNull();
  });

  it('records a per-employee failure without aborting the rest of the batch', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }]));
    mockedGenerate
      .mockRejectedValueOnce(
        AppError.badRequest('No salary record exists for this employee.', 'NO_SALARY_RECORD'),
      )
      .mockResolvedValueOnce({ outcome: 'created' });

    const run = await payrollRunService.start({ month: '2026-08' });
    await flushAsync();

    const status = payrollRunService.getStatus(run.runId);
    expect(status?.status).toBe('completed');
    expect(status?.created).toBe(1);
    expect(status?.processed).toBe(2);
    expect(status?.failed).toEqual([
      { employeeId: 'emp-1', message: 'No salary record exists for this employee.' },
    ]);
  });

  it('returns undefined for an unknown runId', () => {
    expect(payrollRunService.getStatus('does-not-exist')).toBeUndefined();
  });
});
