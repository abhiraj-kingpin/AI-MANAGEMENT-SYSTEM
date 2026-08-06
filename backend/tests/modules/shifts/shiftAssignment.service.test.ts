jest.mock('../../../src/modules/shifts/shift.model', () => ({
  Shift: { findById: jest.fn() },
}));
jest.mock('../../../src/modules/shifts/shiftAssignment.model', () => ({
  ShiftAssignment: {
    findOne: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notify: jest.fn(() => Promise.resolve()),
}));

import { notify } from '../../../src/modules/notifications/notification.service';
import { Shift } from '../../../src/modules/shifts/shift.model';
import { ShiftAssignment } from '../../../src/modules/shifts/shiftAssignment.model';
import {
  getEffectiveShift,
  shiftAssignmentService,
} from '../../../src/modules/shifts/shiftAssignment.service';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedShiftFindById = Shift.findById as unknown as jest.Mock;
const mockedAssignmentFindOne = ShiftAssignment.findOne as unknown as jest.Mock;
const mockedAssignmentUpdateMany = ShiftAssignment.updateMany as unknown as jest.Mock;
const mockedAssignmentCreate = ShiftAssignment.create as unknown as jest.Mock;
const mockedNotify = notify as unknown as jest.Mock;

const EMPLOYEE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const SHIFT_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function fakeShift(overrides: Record<string, unknown> = {}) {
  return {
    id: SHIFT_ID,
    _id: SHIFT_ID,
    name: 'Morning',
    type: 'morning',
    startTime: '09:00',
    endTime: '17:00',
    gracePeriodMinutes: 10,
    isActive: true,
    ...overrides,
  };
}

function fakeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assign-1',
    employeeId: EMPLOYEE_ID,
    shiftId: SHIFT_ID,
    effectiveFrom: new Date('2026-08-10'),
    effectiveTo: null as Date | null,
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

/** `ShiftAssignment.findOne(...).populate('shiftId')` — chainable, thenable. */
function populatedQuery<T>(resolvedValue: T) {
  return {
    sort: jest.fn(function sort(this: unknown) {
      return this;
    }),
    populate: jest.fn(() => Promise.resolve(resolvedValue)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-08-05T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('shiftAssignmentService.assign', () => {
  it('rejects an unknown shift', async () => {
    mockedShiftFindById.mockResolvedValue(null);
    await expect(
      shiftAssignmentService.assign({
        employeeId: EMPLOYEE_ID,
        shiftId: SHIFT_ID,
        effectiveFrom: new Date('2026-08-10'),
      }),
    ).rejects.toMatchObject({ code: 'SHIFT_NOT_FOUND' });
  });

  it('rejects assigning an inactive shift', async () => {
    mockedShiftFindById.mockResolvedValue(fakeShift({ isActive: false }));
    await expect(
      shiftAssignmentService.assign({
        employeeId: EMPLOYEE_ID,
        shiftId: SHIFT_ID,
        effectiveFrom: new Date('2026-08-10'),
      }),
    ).rejects.toMatchObject({ code: 'SHIFT_INACTIVE' });
  });

  it('rejects an effectiveFrom in the past', async () => {
    mockedShiftFindById.mockResolvedValue(fakeShift());
    await expect(
      shiftAssignmentService.assign({
        employeeId: EMPLOYEE_ID,
        shiftId: SHIFT_ID,
        effectiveFrom: new Date('2020-01-01'),
      }),
    ).rejects.toMatchObject({ code: 'EFFECTIVE_FROM_IN_PAST' });
  });

  it('closes out the previously open assignment the day before the new one starts', async () => {
    mockedShiftFindById.mockResolvedValue(fakeShift());
    mockedAssignmentFindOne.mockResolvedValue(null); // no same-day assignment yet
    mockedAssignmentCreate.mockResolvedValue(fakeAssignment());

    await shiftAssignmentService.assign({
      employeeId: EMPLOYEE_ID,
      shiftId: SHIFT_ID,
      effectiveFrom: new Date('2026-08-10'),
    });

    expect(mockedAssignmentUpdateMany).toHaveBeenCalledWith(
      {
        employeeId: EMPLOYEE_ID,
        effectiveTo: null,
        effectiveFrom: { $lt: new Date('2026-08-10') },
      },
      { $set: { effectiveTo: new Date('2026-08-09') } },
    );
    expect(mockedAssignmentCreate).toHaveBeenCalledWith({
      employeeId: EMPLOYEE_ID,
      shiftId: SHIFT_ID,
      effectiveFrom: new Date('2026-08-10'),
      effectiveTo: null,
    });
    expect(mockedNotify).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      expect.any(String),
      expect.stringContaining('Morning'),
      'shift',
      expect.any(Object),
    );
  });

  it('corrects a same-day assignment in place instead of creating a duplicate', async () => {
    mockedShiftFindById.mockResolvedValue(fakeShift());
    const existing = fakeAssignment({ effectiveFrom: new Date('2026-08-10') });
    mockedAssignmentFindOne.mockResolvedValue(existing);

    const dto = await shiftAssignmentService.assign({
      employeeId: EMPLOYEE_ID,
      shiftId: SHIFT_ID,
      effectiveFrom: new Date('2026-08-10'),
    });

    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(mockedAssignmentCreate).not.toHaveBeenCalled();
    expect(mockedAssignmentUpdateMany).not.toHaveBeenCalled();
    expect(dto.shift.id).toBe(SHIFT_ID);
  });
});

describe('shiftAssignmentService.bulkAssign', () => {
  it('reports each employee independently — one failure does not block the others', async () => {
    // Sequential (employeeIds are processed in order, one at a time), so
    // each queued value lines up with exactly one employee's Shift.findById
    // call: employee-1 succeeds, employee-2's shift is "missing", employee-3 succeeds.
    mockedShiftFindById
      .mockResolvedValueOnce(fakeShift())
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeShift());
    mockedAssignmentFindOne
      .mockResolvedValueOnce(null) // employee-1: no same-day record
      .mockResolvedValueOnce(null); // employee-3: no same-day record
    mockedAssignmentCreate.mockResolvedValue(fakeAssignment());

    const result = await shiftAssignmentService.bulkAssign({
      employeeIds: ['employee-1', 'employee-2', 'employee-3'],
      shiftId: SHIFT_ID,
      effectiveFrom: new Date('2026-08-10'),
    });

    expect(result.assigned).toEqual(['employee-1', 'employee-3']);
    expect(result.failed).toEqual([{ employeeId: 'employee-2', message: 'Shift not found.' }]);
  });
});

describe('shiftAssignmentService.getMyShift', () => {
  it('rejects an actor with no linked employee profile', async () => {
    const actor: ActorContext = { id: 'user-x', role: 'employee' };
    await expect(shiftAssignmentService.getMyShift(actor)).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });

  it('returns null when the employee has no effective assignment', async () => {
    mockedAssignmentFindOne.mockReturnValue(populatedQuery(null));
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    expect(await shiftAssignmentService.getMyShift(actor)).toBeNull();
  });

  it('returns the current shift, populated', async () => {
    const assignment = fakeAssignment({ shiftId: fakeShift() });
    mockedAssignmentFindOne.mockReturnValue(populatedQuery(assignment));
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    const dto = await shiftAssignmentService.getMyShift(actor);

    expect(dto?.shift.name).toBe('Morning');
    expect(dto?.employeeId).toBe(EMPLOYEE_ID);
  });
});

describe('getEffectiveShift (used by attendance.service.ts)', () => {
  it('returns null when nothing is assigned', async () => {
    mockedAssignmentFindOne.mockReturnValue(populatedQuery(null));
    expect(await getEffectiveShift(EMPLOYEE_ID, new Date('2026-08-10'))).toBeNull();
  });

  it('returns startTime/gracePeriodMinutes/workdayMinutes derived from the assigned shift', async () => {
    const assignment = fakeAssignment({
      shiftId: fakeShift({ startTime: '22:00', endTime: '06:00', gracePeriodMinutes: 5 }),
    });
    mockedAssignmentFindOne.mockReturnValue(populatedQuery(assignment));

    const result = await getEffectiveShift(EMPLOYEE_ID, new Date('2026-08-10'));

    expect(result).toEqual({
      startTime: '22:00',
      gracePeriodMinutes: 5,
      workdayMinutes: 8 * 60, // 22:00 -> 06:00, wraps past midnight
      shiftId: SHIFT_ID,
    });
  });
});
