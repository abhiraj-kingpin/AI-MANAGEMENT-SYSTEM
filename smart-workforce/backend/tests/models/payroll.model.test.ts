import { Types } from 'mongoose';
import { Payslip } from '../../src/modules/payroll/payslip.model';
import { Salary } from '../../src/modules/payroll/salary.model';

describe('Salary model validation', () => {
  it('accepts a well-formed salary record', () => {
    const salary = new Salary({
      employeeId: new Types.ObjectId(),
      baseSalary: 50000,
      allowances: { hra: 5000 },
      deductions: { pf: 1800 },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(salary.validateSync()).toBeUndefined();
    expect(salary.currency).toBe('INR');
  });

  it('rejects a negative baseSalary', () => {
    const salary = new Salary({
      employeeId: new Types.ObjectId(),
      baseSalary: -100,
      effectiveFrom: new Date('2026-01-01'),
    });

    const error = salary.validateSync();
    expect(error?.errors.baseSalary).toBeDefined();
  });

  it('requires effectiveFrom', () => {
    const salary = new Salary({ employeeId: new Types.ObjectId(), baseSalary: 50000 });
    const error = salary.validateSync();
    expect(error?.errors.effectiveFrom).toBeDefined();
  });
});

describe('Payslip model validation', () => {
  it('accepts a well-formed payslip', () => {
    const payslip = new Payslip({
      employeeId: new Types.ObjectId(),
      salaryId: new Types.ObjectId(),
      month: '2026-08',
      grossPay: 55000,
      netPay: 51000,
    });

    expect(payslip.validateSync()).toBeUndefined();
    expect(payslip.status).toBe('draft');
    expect(payslip.latePenalty).toBe(0);
  });

  it('rejects a malformed month', () => {
    const payslip = new Payslip({
      employeeId: new Types.ObjectId(),
      salaryId: new Types.ObjectId(),
      month: '08-2026',
      grossPay: 1000,
      netPay: 1000,
    });

    const error = payslip.validateSync();
    expect(error?.errors.month).toBeDefined();
  });

  it('rejects a status outside the enum', () => {
    const payslip = new Payslip({
      employeeId: new Types.ObjectId(),
      salaryId: new Types.ObjectId(),
      month: '2026-08',
      grossPay: 1000,
      netPay: 1000,
      status: 'archived',
    });

    const error = payslip.validateSync();
    expect(error?.errors.status).toBeDefined();
  });

  it('rejects a negative grossPay', () => {
    const payslip = new Payslip({
      employeeId: new Types.ObjectId(),
      salaryId: new Types.ObjectId(),
      month: '2026-08',
      grossPay: -1,
      netPay: 0,
    });

    const error = payslip.validateSync();
    expect(error?.errors.grossPay).toBeDefined();
  });
});
