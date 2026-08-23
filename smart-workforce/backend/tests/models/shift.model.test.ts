import { Types } from 'mongoose';
import { Shift } from '../../src/modules/shifts/shift.model';
import { ShiftAssignment } from '../../src/modules/shifts/shiftAssignment.model';

describe('Shift model validation', () => {
  it('accepts a well-formed shift', () => {
    const shift = new Shift({
      name: 'Morning',
      type: 'morning',
      startTime: '09:00',
      endTime: '17:00',
    });

    expect(shift.validateSync()).toBeUndefined();
    expect(shift.gracePeriodMinutes).toBe(10);
    expect(shift.isActive).toBe(true);
  });

  it('rejects a type outside the enum', () => {
    const shift = new Shift({
      name: 'Made Up',
      type: 'afternoon',
      startTime: '09:00',
      endTime: '17:00',
    });

    const error = shift.validateSync();
    expect(error?.errors.type).toBeDefined();
  });

  it('rejects a malformed startTime', () => {
    const shift = new Shift({
      name: 'Morning',
      type: 'morning',
      startTime: '9am',
      endTime: '17:00',
    });
    const error = shift.validateSync();
    expect(error?.errors.startTime).toBeDefined();
  });

  it('rejects a negative gracePeriodMinutes', () => {
    const shift = new Shift({
      name: 'Morning',
      type: 'morning',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriodMinutes: -5,
    });
    const error = shift.validateSync();
    expect(error?.errors.gracePeriodMinutes).toBeDefined();
  });

  it('accepts a night shift whose endTime is numerically before startTime (wraps past midnight)', () => {
    const shift = new Shift({ name: 'Night', type: 'night', startTime: '22:00', endTime: '06:00' });
    expect(shift.validateSync()).toBeUndefined();
  });
});

describe('ShiftAssignment model validation', () => {
  it('accepts a well-formed, open-ended assignment', () => {
    const assignment = new ShiftAssignment({
      employeeId: new Types.ObjectId(),
      shiftId: new Types.ObjectId(),
      effectiveFrom: new Date('2026-08-10'),
    });

    expect(assignment.validateSync()).toBeUndefined();
    expect(assignment.effectiveTo).toBeNull();
  });

  it('accepts effectiveTo on or after effectiveFrom', () => {
    const assignment = new ShiftAssignment({
      employeeId: new Types.ObjectId(),
      shiftId: new Types.ObjectId(),
      effectiveFrom: new Date('2026-08-10'),
      effectiveTo: new Date('2026-08-10'),
    });
    expect(assignment.validateSync()).toBeUndefined();
  });

  it('rejects an effectiveTo before effectiveFrom', () => {
    const assignment = new ShiftAssignment({
      employeeId: new Types.ObjectId(),
      shiftId: new Types.ObjectId(),
      effectiveFrom: new Date('2026-08-10'),
      effectiveTo: new Date('2026-08-05'),
    });

    const error = assignment.validateSync();
    expect(error?.errors.effectiveTo).toBeDefined();
  });
});
