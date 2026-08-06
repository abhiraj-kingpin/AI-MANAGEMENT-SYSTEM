import { Types } from 'mongoose';
import { Employee } from '../../src/modules/employees/employee.model';

function baseDoc(overrides: Record<string, unknown> = {}) {
  return new Employee({
    userId: new Types.ObjectId(),
    employeeCode: 'EMP-0001',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+919876543210',
    departmentId: new Types.ObjectId(),
    designation: 'Software Engineer',
    dateOfJoining: new Date('2026-01-15'),
    ...overrides,
  });
}

describe('Employee model validation', () => {
  it('accepts a well-formed document with defaulted sub-objects', () => {
    const employee = baseDoc();

    expect(employee.validateSync()).toBeUndefined();
    expect(employee.employmentStatus).toBe('active');
    expect(employee.isDeleted).toBe(false);
  });

  it('rejects a malformed phone number', () => {
    const employee = baseDoc({ phone: 'abc' });

    const error = employee.validateSync();
    expect(error?.errors.phone).toBeDefined();
  });

  it('requires departmentId and dateOfJoining', () => {
    const employee = new Employee({
      userId: new Types.ObjectId(),
      employeeCode: 'EMP-0002',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+919876543210',
      designation: 'Engineer',
    });

    const error = employee.validateSync();
    expect(error?.errors.departmentId).toBeDefined();
    expect(error?.errors.dateOfJoining).toBeDefined();
  });

  it('rejects an employmentStatus outside the enum', () => {
    const employee = baseDoc({ employmentStatus: 'retired' });

    const error = employee.validateSync();
    expect(error?.errors.employmentStatus).toBeDefined();
  });
});
