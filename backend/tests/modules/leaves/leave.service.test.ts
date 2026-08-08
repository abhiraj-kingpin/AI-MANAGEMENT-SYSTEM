import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — every model and cross-module collaborator
// mocked, no live database. Same approach as attendance.service.test.ts.
jest.mock('../../../src/modules/leaves/leave.model', () => {
  const actual = jest.requireActual('../../../src/modules/leaves/leave.model');
  return {
    ...actual,
    Leave: {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    },
  };
});
jest.mock('../../../src/modules/leaves/leaveType.model', () => ({
  LeaveType: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/leaveBalance.model', () => ({
  LeaveBalance: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/holiday.model', () => ({
  Holiday: { find: jest.fn() },
}));
jest.mock('../../../src/modules/attendance/attendance.model', () => ({
  Attendance: { updateOne: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notify: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/shared/utils/teamScope', () => ({
  getManagedEmployeeIds: jest.fn(),
}));

import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { Employee } from '../../../src/modules/employees/employee.model';
import { Holiday } from '../../../src/modules/leaves/holiday.model';
import { Leave } from '../../../src/modules/leaves/leave.model';
import { leaveService } from '../../../src/modules/leaves/leave.service';
import { LeaveBalance } from '../../../src/modules/leaves/leaveBalance.model';
import { LeaveType } from '../../../src/modules/leaves/leaveType.model';
import { notify } from '../../../src/modules/notifications/notification.service';
import { getManagedEmployeeIds } from '../../../src/shared/utils/teamScope';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedLeaveCreate = Leave.create as unknown as jest.Mock;
const mockedLeaveFindById = Leave.findById as unknown as jest.Mock;
const mockedLeaveFindOne = Leave.findOne as unknown as jest.Mock;
const mockedLeaveFind = Leave.find as unknown as jest.Mock;
const mockedLeaveCount = Leave.countDocuments as unknown as jest.Mock;
const mockedLeaveTypeFindById = LeaveType.findById as unknown as jest.Mock;
const mockedLeaveTypeFind = LeaveType.find as unknown as jest.Mock;
const mockedBalanceFindOne = LeaveBalance.findOne as unknown as jest.Mock;
const mockedBalanceFindOneAndUpdate = LeaveBalance.findOneAndUpdate as unknown as jest.Mock;
const mockedHolidayFind = Holiday.find as unknown as jest.Mock;
const mockedAttendanceUpdateOne = Attendance.updateOne as unknown as jest.Mock;
const mockedAttendanceDeleteMany = Attendance.deleteMany as unknown as jest.Mock;
const mockedEmployeeFindById = Employee.findById as unknown as jest.Mock;
const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedNotify = notify as unknown as jest.Mock;
const mockedGetManagedEmployeeIds = getManagedEmployeeIds as unknown as jest.Mock;

const EMPLOYEE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const LEAVE_TYPE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const employee: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };
const noProfile: ActorContext = { id: 'user-x', role: 'employee' };
const hr: ActorContext = { id: 'user-hr', role: 'hr', employeeId: 'dddddddddddddddddddddddd' };
const manager: ActorContext = {
  id: 'user-mgr',
  role: 'manager',
  employeeId: 'cccccccccccccccccccccccc',
};

function fakeLeaveType(overrides: Record<string, unknown> = {}) {
  return { id: LEAVE_TYPE_ID, name: 'Casual Leave', defaultAnnualQuota: 12, ...overrides };
}

function fakeLeave(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leave-1',
    employeeId: EMPLOYEE_ID,
    leaveTypeId: LEAVE_TYPE_ID,
    startDate: new Date('2026-08-10'), // Monday
    endDate: new Date('2026-08-11'), // Tuesday
    totalDays: 2,
    reason: 'Personal',
    status: 'pending',
    approvedBy: null,
    managerComment: undefined,
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
  mockedHolidayFind.mockReturnValue(mockQuery([]));
  // apply() always looks up the applicant to find their manager to notify —
  // default to "no employee record found" so tests that don't care about
  // notifications don't need to stub this too; it just means notify() is a
  // no-op (no manager to reach), not a crash.
  mockedEmployeeFindById.mockReturnValue(mockQuery(null));
  // getMyLeaves/list both resolve leave-type names (and list also resolves
  // employee names) via a batch lookup chaining `.select(...)` — mockQuery
  // (not a bare mockResolvedValue) so that chain doesn't blow up — default
  // to "nothing found" so tests that don't care about the resolved name
  // don't need to stub this too, matching mockedEmployeeFindById's default
  // above. getMyBalance's own unrelated `LeaveType.find()` call (no
  // `.select()`) is unaffected by this and still overridden per-test below.
  mockedLeaveTypeFind.mockReturnValue(mockQuery([]));
  mockedEmployeeFind.mockReturnValue(mockQuery([]));
});

describe('leaveService.apply', () => {
  const input = {
    leaveTypeId: LEAVE_TYPE_ID,
    startDate: new Date('2026-08-10'), // Monday
    endDate: new Date('2026-08-11'), // Tuesday
    reason: 'Family function',
  };

  it('rejects an actor with no linked employee profile', async () => {
    await expect(leaveService.apply(noProfile, input)).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });

  it('rejects an unknown leave type', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(null);
    await expect(leaveService.apply(employee, input)).rejects.toMatchObject({
      code: 'LEAVE_TYPE_NOT_FOUND',
    });
  });

  it('rejects a range overlapping an existing pending/approved leave', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());
    mockedLeaveFindOne.mockResolvedValue(fakeLeave());

    await expect(leaveService.apply(employee, input)).rejects.toMatchObject({
      code: 'LEAVE_OVERLAP',
    });
  });

  it('rejects a range that has no working days (weekend-only)', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());
    mockedLeaveFindOne.mockResolvedValue(null);

    await expect(
      leaveService.apply(employee, {
        ...input,
        startDate: new Date('2026-08-15'), // Saturday
        endDate: new Date('2026-08-16'), // Sunday
      }),
    ).rejects.toMatchObject({ code: 'NO_WORKING_DAYS' });
  });

  it('rejects a request that exceeds the remaining balance', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType({ defaultAnnualQuota: 1 }));
    mockedLeaveFindOne.mockResolvedValue(null);
    mockedBalanceFindOne.mockResolvedValue(null); // no existing balance -> default quota (1) applies

    await expect(leaveService.apply(employee, input)).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      details: { remaining: 1, requested: 2 },
    });
  });

  it('creates a pending leave with totalDays computed from business days, excluding holidays', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());
    mockedLeaveFindOne.mockResolvedValue(null);
    mockedBalanceFindOne.mockResolvedValue(null);
    mockedHolidayFind.mockReturnValue(mockQuery([{ date: new Date('2026-08-11') }]));
    mockedLeaveCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakeLeave(data)),
    );

    const dto = await leaveService.apply(employee, input);

    expect(mockedLeaveCreate).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: EMPLOYEE_ID, totalDays: 1, status: 'pending' }),
    );
    expect(dto.totalDays).toBe(1);
    expect(dto.status).toBe('pending');
  });

  it("notifies the applicant's manager, when one is assigned", async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());
    mockedLeaveFindOne.mockResolvedValue(null);
    mockedBalanceFindOne.mockResolvedValue(null);
    mockedEmployeeFindById.mockReturnValue(
      mockQuery({ managerId: 'manager-1', firstName: 'Asha', lastName: 'Rao' }),
    );
    mockedLeaveCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakeLeave(data)),
    );

    await leaveService.apply(employee, input);

    expect(mockedNotify).toHaveBeenCalledWith(
      'manager-1',
      expect.any(String),
      expect.stringContaining('Asha Rao'),
      'leave',
      expect.any(Object),
    );
  });

  it('skips notification when the applicant has no manager assigned', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());
    mockedLeaveFindOne.mockResolvedValue(null);
    mockedBalanceFindOne.mockResolvedValue(null);
    mockedEmployeeFindById.mockReturnValue(
      mockQuery({ managerId: null, firstName: 'Asha', lastName: 'Rao' }),
    );
    mockedLeaveCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakeLeave(data)),
    );

    await leaveService.apply(employee, input);

    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('accounts for carriedForward when checking sufficiency', async () => {
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType({ defaultAnnualQuota: 0 }));
    mockedLeaveFindOne.mockResolvedValue(null);
    mockedBalanceFindOne.mockResolvedValue({ allocated: 0, used: 0, carriedForward: 5 });
    mockedLeaveCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(fakeLeave(data)),
    );

    const dto = await leaveService.apply(employee, input);
    expect(dto.status).toBe('pending');
  });
});

describe('leaveService.cancel', () => {
  it('404s for a missing leave', async () => {
    mockedLeaveFindById.mockResolvedValue(null);
    await expect(leaveService.cancel('ghost', employee)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it("rejects cancelling someone else's leave", async () => {
    mockedLeaveFindById.mockResolvedValue(fakeLeave({ employeeId: 'other-employee-id' }));
    await expect(leaveService.cancel('leave-1', employee)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('cancels a pending leave outright, no balance/attendance side effects', async () => {
    const leave = fakeLeave({ status: 'pending' });
    mockedLeaveFindById.mockResolvedValue(leave);

    const dto = await leaveService.cancel('leave-1', employee);

    expect(dto.status).toBe('cancelled');
    expect(mockedBalanceFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockedAttendanceDeleteMany).not.toHaveBeenCalled();
  });

  it('reverses balance and clears future on_leave stubs when cancelling a future approved leave', async () => {
    const leave = fakeLeave({
      status: 'approved',
      startDate: new Date('2099-01-05'),
      endDate: new Date('2099-01-06'),
      totalDays: 2,
    });
    mockedLeaveFindById.mockResolvedValue(leave);

    const dto = await leaveService.cancel('leave-1', employee);

    expect(mockedBalanceFindOneAndUpdate).toHaveBeenCalledWith(
      { employeeId: EMPLOYEE_ID, leaveTypeId: LEAVE_TYPE_ID, year: 2099 },
      expect.objectContaining({ $inc: { used: -2 } }),
      { upsert: true },
    );
    expect(mockedAttendanceDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: EMPLOYEE_ID, status: 'on_leave', checkInAt: null }),
    );
    expect(dto.status).toBe('cancelled');
  });

  it('rejects cancelling a leave already in the past', async () => {
    const leave = fakeLeave({
      status: 'approved',
      startDate: new Date('2020-01-05'),
      endDate: new Date('2020-01-06'),
    });
    mockedLeaveFindById.mockResolvedValue(leave);

    await expect(leaveService.cancel('leave-1', employee)).rejects.toMatchObject({
      code: 'CANNOT_CANCEL',
    });
  });

  it('rejects cancelling an already-rejected leave', async () => {
    mockedLeaveFindById.mockResolvedValue(fakeLeave({ status: 'rejected' }));
    await expect(leaveService.cancel('leave-1', employee)).rejects.toMatchObject({
      code: 'CANNOT_CANCEL',
    });
  });
});

describe('leaveService.getMyLeaves / getMyBalance', () => {
  it('scopes history to the caller and applies an optional status filter', async () => {
    mockedLeaveFind.mockReturnValue(mockQuery([fakeLeave()]));

    await leaveService.getMyLeaves(employee, 'approved');

    expect(mockedLeaveFind).toHaveBeenCalledWith({ employeeId: EMPLOYEE_ID, status: 'approved' });
  });

  it("resolves the leave type's real name instead of leaving it a bare id", async () => {
    mockedLeaveFind.mockReturnValue(mockQuery([fakeLeave()]));
    mockedLeaveTypeFind.mockReturnValue(mockQuery([{ _id: LEAVE_TYPE_ID, name: 'Casual Leave' }]));

    const [leave] = await leaveService.getMyLeaves(employee);

    expect(leave.leaveTypeName).toBe('Casual Leave');
    expect(leave.employee).toBeUndefined(); // own history — no name needed for yourself
  });

  it('computes remaining balance per leave type for the current year', async () => {
    mockedLeaveTypeFind.mockResolvedValue([fakeLeaveType({ id: LEAVE_TYPE_ID, name: 'Casual' })]);
    mockedBalanceFindOne.mockResolvedValue({ allocated: 12, used: 3, carriedForward: 0 });

    const balances = await leaveService.getMyBalance(employee);

    expect(balances).toEqual([
      expect.objectContaining({
        leaveTypeId: LEAVE_TYPE_ID,
        leaveTypeName: 'Casual',
        allocated: 12,
        used: 3,
        remaining: 9,
      }),
    ]);
  });
});

describe('leaveService.list', () => {
  it('blocks a plain employee from the review queue', async () => {
    await expect(leaveService.list({ page: 1, limit: 20 }, employee)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('scopes a manager to their team, ignoring an unrelated employeeId filter', async () => {
    mockedGetManagedEmployeeIds.mockResolvedValue(['teammate-1']);
    mockedLeaveFind.mockReturnValue(mockQuery([]));
    mockedLeaveCount.mockResolvedValue(0);

    await expect(
      leaveService.list({ page: 1, limit: 20, employeeId: 'not-my-report' }, manager),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets a manager filter within their own team', async () => {
    mockedGetManagedEmployeeIds.mockResolvedValue(['teammate-1']);
    mockedLeaveFind.mockReturnValue(mockQuery([fakeLeave()]));
    mockedLeaveCount.mockResolvedValue(1);

    const result = await leaveService.list(
      { page: 1, limit: 20, employeeId: 'teammate-1' },
      manager,
    );

    expect(mockedLeaveFind).toHaveBeenCalledWith({ employeeId: 'teammate-1' });
    expect(result.total).toBe(1);
  });

  it('lets HR see everyone, paginated', async () => {
    mockedLeaveFind.mockReturnValue(mockQuery([fakeLeave(), fakeLeave()]));
    mockedLeaveCount.mockResolvedValue(2);

    const result = await leaveService.list({ page: 1, limit: 20 }, hr);

    expect(mockedLeaveFind).toHaveBeenCalledWith({});
    expect(result.items).toHaveLength(2);
    expect(result.pages).toBe(1);
  });

  it("attaches each row's employee name/code and leave-type name — the review queue is useless as bare ids", async () => {
    mockedLeaveFind.mockReturnValue(mockQuery([fakeLeave()]));
    mockedLeaveCount.mockResolvedValue(1);
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: EMPLOYEE_ID, employeeCode: 'ENG-0001', firstName: 'Asha', lastName: 'Rao' },
      ]),
    );
    mockedLeaveTypeFind.mockReturnValue(mockQuery([{ _id: LEAVE_TYPE_ID, name: 'Casual Leave' }]));

    const result = await leaveService.list({ page: 1, limit: 20 }, hr);

    expect(result.items[0].employee).toEqual({
      id: EMPLOYEE_ID,
      employeeCode: 'ENG-0001',
      firstName: 'Asha',
      lastName: 'Rao',
    });
    expect(result.items[0].leaveTypeName).toBe('Casual Leave');
  });
});

describe('leaveService.review', () => {
  it('404s for a missing leave', async () => {
    mockedLeaveFindById.mockResolvedValue(null);
    await expect(leaveService.review('ghost', 'approved', hr, undefined)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects re-reviewing a leave that already has a decision', async () => {
    mockedLeaveFindById.mockResolvedValue(fakeLeave({ status: 'approved' }));
    await expect(leaveService.review('leave-1', 'approved', hr, undefined)).rejects.toMatchObject({
      code: 'ALREADY_REVIEWED',
    });
  });

  it('rejects a manager reviewing an employee outside their team', async () => {
    mockedLeaveFindById.mockResolvedValue(fakeLeave({ status: 'pending' }));
    mockedGetManagedEmployeeIds.mockResolvedValue(['someone-else']);

    await expect(
      leaveService.review('leave-1', 'approved', manager, undefined),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects outright, no balance/attendance side effects', async () => {
    const leave = fakeLeave({ status: 'pending' });
    mockedLeaveFindById.mockResolvedValue(leave);

    const dto = await leaveService.review('leave-1', 'rejected', hr, 'Team is short-staffed');

    expect(dto.status).toBe('rejected');
    expect(dto.managerComment).toBe('Team is short-staffed');
    expect(mockedBalanceFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockedAttendanceUpdateOne).not.toHaveBeenCalled();
    expect(mockedNotify).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      expect.stringContaining('rejected'),
      expect.stringContaining('Team is short-staffed'),
      'leave',
      expect.any(Object),
    );
  });

  it('on approval: increments used balance and stamps on_leave attendance for each business day', async () => {
    const leave = fakeLeave({
      status: 'pending',
      startDate: new Date('2026-08-10'), // Monday
      endDate: new Date('2026-08-11'), // Tuesday
      totalDays: 2,
    });
    mockedLeaveFindById.mockResolvedValue(leave);
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType({ defaultAnnualQuota: 12 }));

    const dto = await leaveService.review('leave-1', 'approved', hr, 'Approved');

    expect(dto.status).toBe('approved');
    expect(dto.approvedBy).toBe(hr.employeeId);
    expect(mockedBalanceFindOneAndUpdate).toHaveBeenCalledWith(
      { employeeId: EMPLOYEE_ID, leaveTypeId: LEAVE_TYPE_ID, year: 2026 },
      expect.objectContaining({ $inc: { used: 2 } }),
      { upsert: true },
    );
    expect(mockedAttendanceUpdateOne).toHaveBeenCalledTimes(2);
    expect(mockedAttendanceUpdateOne).toHaveBeenCalledWith(
      { employeeId: EMPLOYEE_ID, date: new Date('2026-08-10') },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({ status: 'on_leave', method: 'manual' }),
      }),
      { upsert: true },
    );
  });

  it('lets a manager approve a leave for their own team member', async () => {
    const leave = fakeLeave({ status: 'pending' });
    mockedLeaveFindById.mockResolvedValue(leave);
    mockedGetManagedEmployeeIds.mockResolvedValue([EMPLOYEE_ID]);
    mockedLeaveTypeFindById.mockResolvedValue(fakeLeaveType());

    const dto = await leaveService.review('leave-1', 'approved', manager, undefined);
    expect(dto.status).toBe('approved');
    expect(dto.approvedBy).toBe(manager.employeeId);
  });
});
