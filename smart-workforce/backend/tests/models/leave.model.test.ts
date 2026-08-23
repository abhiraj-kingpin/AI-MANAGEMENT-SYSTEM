import { Types } from 'mongoose';
import { Leave } from '../../src/modules/leaves/leave.model';

describe('Leave model validation', () => {
  it('accepts a well-formed leave request', () => {
    const leave = new Leave({
      employeeId: new Types.ObjectId(),
      leaveTypeId: new Types.ObjectId(),
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-12'),
      totalDays: 3,
      reason: 'Family function',
    });

    expect(leave.validateSync()).toBeUndefined();
    expect(leave.status).toBe('pending');
  });

  it('rejects an endDate before startDate', () => {
    const leave = new Leave({
      employeeId: new Types.ObjectId(),
      leaveTypeId: new Types.ObjectId(),
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-05'),
      totalDays: 1,
      reason: 'Typo in dates',
    });

    const error = leave.validateSync();
    expect(error?.errors.endDate).toBeDefined();
  });

  it('rejects totalDays below the 0.5-day minimum', () => {
    const leave = new Leave({
      employeeId: new Types.ObjectId(),
      leaveTypeId: new Types.ObjectId(),
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-10'),
      totalDays: 0,
      reason: 'Too short',
    });

    const error = leave.validateSync();
    expect(error?.errors.totalDays).toBeDefined();
  });

  it('rejects a status outside the enum', () => {
    const leave = new Leave({
      employeeId: new Types.ObjectId(),
      leaveTypeId: new Types.ObjectId(),
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-10'),
      totalDays: 1,
      reason: 'Ok',
      status: 'archived',
    });

    const error = leave.validateSync();
    expect(error?.errors.status).toBeDefined();
  });
});
