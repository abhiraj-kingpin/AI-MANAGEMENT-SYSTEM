import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — every model and the holiday-lookup it borrows
// from the leaves module are mocked, no live database. Same approach as
// every other *.service.test.ts in this suite.
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));
jest.mock('../../../src/modules/attendance/attendance.model', () => ({
  Attendance: { find: jest.fn(), aggregate: jest.fn() },
}));
jest.mock('../../../src/modules/departments/department.model', () => ({
  Department: { find: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/holiday.service', () => ({
  getHolidayDatesInRange: jest.fn(),
}));

import { analyticsService } from '../../../src/modules/analytics/analytics.service';
import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { Department } from '../../../src/modules/departments/department.model';
import { Employee } from '../../../src/modules/employees/employee.model';
import { getHolidayDatesInRange } from '../../../src/modules/leaves/holiday.service';
import { analyticsCache } from '../../../src/shared/cache/memoryCache';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedAttendanceFind = Attendance.find as unknown as jest.Mock;
const mockedAttendanceAggregate = Attendance.aggregate as unknown as jest.Mock;
const mockedDepartmentFind = Department.find as unknown as jest.Mock;
const mockedGetHolidayDatesInRange = getHolidayDatesInRange as unknown as jest.Mock;

const hr: ActorContext = { id: 'user-hr', role: 'hr' };
const manager: ActorContext = { id: 'user-mgr', role: 'manager', employeeId: 'mgr-1' };
const employeeActor: ActorContext = { id: 'user-emp', role: 'employee', employeeId: 'emp-1' };

// Valid-looking 24-char hex ids — required wherever the service feeds an id
// into `new Types.ObjectId(...)` (getAttendanceTrend), which throws on
// anything shorter/non-hex like a plain 'e1'.
const idOf = (suffix: string) => `${'a'.repeat(24 - suffix.length)}${suffix}`;

function employeeRows(...ids: string[]) {
  return ids.map((id) => ({ _id: id }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetHolidayDatesInRange.mockResolvedValue([]);
  // getDashboardKpis/getDepartmentComparison are now cached (Phase 17) — a
  // real, process-wide cache, not mocked, so it persists across `it` blocks
  // unless explicitly cleared. Several tests below reuse the same actor and
  // an empty query, which would otherwise collide on the same cache key and
  // silently return an earlier test's mocked result.
  analyticsCache.clear();
});

describe('analyticsService.getDashboardKpis', () => {
  it('rejects a plain employee', async () => {
    await expect(analyticsService.getDashboardKpis(employeeActor, {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('scopes a manager to their own direct reports', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1')));
    mockedAttendanceFind.mockReturnValue(mockQuery([]));

    await analyticsService.getDashboardKpis(manager, {});

    expect(mockedEmployeeFind).toHaveBeenCalledWith({ isDeleted: false, managerId: 'mgr-1' });
  });

  it('applies a departmentId filter for HR/Admin', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1')));
    mockedAttendanceFind.mockReturnValue(mockQuery([]));

    await analyticsService.getDashboardKpis(hr, { departmentId: 'dept-1' });

    expect(mockedEmployeeFind).toHaveBeenCalledWith({ isDeleted: false, departmentId: 'dept-1' });
  });

  it('returns a zeroed DTO — and never queries Attendance — when headcount is 0', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await analyticsService.getDashboardKpis(hr, {});

    expect(result).toEqual({
      date: expect.any(Date),
      headcount: 0,
      attendanceRate: 0,
      lateRate: 0,
      leaveRate: 0,
      presentCount: 0,
      lateCount: 0,
      onLeaveCount: 0,
    });
    expect(mockedAttendanceFind).not.toHaveBeenCalled();
  });

  it('computes real rates from a mix of attendance statuses', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1', 'e2', 'e3', 'e4')));
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        { status: 'present' },
        { status: 'late' },
        { status: 'on_leave' },
        // The 4th employee has no record at all today — absent by omission.
      ]),
    );

    const result = await analyticsService.getDashboardKpis(hr, {});

    expect(result.headcount).toBe(4);
    expect(result.presentCount).toBe(2); // 'present' and 'late' both count as worked
    expect(result.lateCount).toBe(1);
    expect(result.onLeaveCount).toBe(1);
    expect(result.attendanceRate).toBe(50); // 2/4
    expect(result.lateRate).toBe(25); // 1/4
    expect(result.leaveRate).toBe(25); // 1/4
  });

  it('normalizes the query date to UTC midnight before filtering Attendance', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1')));
    mockedAttendanceFind.mockReturnValue(mockQuery([]));

    await analyticsService.getDashboardKpis(hr, { date: new Date('2026-08-03T15:00:00Z') });

    expect(mockedAttendanceFind).toHaveBeenCalledWith({
      employeeId: { $in: ['e1'] },
      date: new Date('2026-08-03T00:00:00.000Z'),
    });
  });
});

describe('analyticsService.getAttendanceTrend', () => {
  it('rejects a plain employee', async () => {
    await expect(
      analyticsService.getAttendanceTrend(employeeActor, { months: 3 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns an empty array — and never aggregates — when the caller has no employees in scope', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await analyticsService.getAttendanceTrend(hr, { months: 3 });

    expect(result).toEqual([]);
    expect(mockedAttendanceAggregate).not.toHaveBeenCalled();
  });

  it('computes attendance/late rate against real business-day counts', async () => {
    // August 2026: 31 days, Aug 1 is a Saturday -> 21 weekdays (Mon-Fri),
    // hand-counted the same way shared/utils/businessDays.ts would.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    const e1 = idOf('1');
    const e2 = idOf('2');
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows(e1, e2)));
    mockedAttendanceAggregate.mockResolvedValue([
      { _id: '2026-08', presentCount: 21, lateCount: 5 },
    ]);

    const result = await analyticsService.getAttendanceTrend(hr, { months: 1 });

    // expected = 21 working days * 2 employees = 42
    expect(result).toEqual([{ month: '2026-08', attendanceRate: 50, lateRate: 11.9 }]);
    jest.useRealTimers();
  });

  it('reports 0 for a month with no matching aggregation bucket', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows(idOf('1'))));
    mockedAttendanceAggregate.mockResolvedValue([]); // no attendance recorded at all this month

    const result = await analyticsService.getAttendanceTrend(hr, { months: 1 });

    expect(result).toEqual([{ month: '2026-08', attendanceRate: 0, lateRate: 0 }]);
    jest.useRealTimers();
  });
});

describe('analyticsService.getDepartmentComparison', () => {
  it('reports headcount 0 and skips the Attendance query for an empty department', async () => {
    mockedDepartmentFind.mockReturnValue(mockQuery([{ _id: 'dept-1', name: 'Ops' }]));
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await analyticsService.getDepartmentComparison({});

    expect(result).toEqual([
      {
        departmentId: 'dept-1',
        departmentName: 'Ops',
        headcount: 0,
        attendanceRate: 0,
        lateRate: 0,
      },
    ]);
    expect(mockedAttendanceFind).not.toHaveBeenCalled();
  });

  it('computes independent rates per department', async () => {
    mockedDepartmentFind.mockReturnValue(
      mockQuery([
        { _id: 'dept-1', name: 'Engineering' },
        { _id: 'dept-2', name: 'Sales' },
      ]),
    );
    mockedEmployeeFind
      .mockReturnValueOnce(mockQuery(employeeRows('e1', 'e2')))
      .mockReturnValueOnce(mockQuery(employeeRows('e3', 'e4')));
    mockedAttendanceFind
      .mockReturnValueOnce(mockQuery([{ status: 'present' }, { status: 'late' }]))
      .mockReturnValueOnce(mockQuery([{ status: 'present' }]));

    const result = await analyticsService.getDepartmentComparison({});

    expect(result).toEqual([
      {
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        headcount: 2,
        attendanceRate: 100,
        lateRate: 50,
      },
      {
        departmentId: 'dept-2',
        departmentName: 'Sales',
        headcount: 2,
        attendanceRate: 50,
        lateRate: 0,
      },
    ]);
  });
});

describe('analyticsService.exportAttendanceCsv', () => {
  it('produces a header row plus one row per attendance record, scoped by department when given', async () => {
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: 'e1', employeeCode: 'ENG-0001', firstName: 'Asha', lastName: 'Rao' }]),
    );
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'e1',
          date: new Date('2026-08-01T00:00:00Z'),
          status: 'present',
          checkInAt: new Date('2026-08-01T09:00:00Z'),
          checkOutAt: new Date('2026-08-01T18:00:00Z'),
          workingMinutes: 480,
          overtimeMinutes: 0,
        },
      ]),
    );

    const csv = await analyticsService.exportAttendanceCsv({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
      departmentId: 'dept-1',
    });

    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'Employee Code,Employee Name,Date,Status,Check In,Check Out,Working Minutes,Overtime Minutes',
    );
    expect(lines[1]).toBe(
      'ENG-0001,Asha Rao,2026-08-01,present,2026-08-01T09:00:00.000Z,2026-08-01T18:00:00.000Z,480,0',
    );
    expect(mockedEmployeeFind).toHaveBeenCalledWith({ isDeleted: false, departmentId: 'dept-1' });
  });

  it('caps the export at 5000 rows (Phase 17 fix — this query previously had no limit at all)', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));
    const query = mockQuery([]);
    mockedAttendanceFind.mockReturnValue(query);

    await analyticsService.exportAttendanceCsv({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(query.limit).toHaveBeenCalledWith(5000);
  });

  it('quotes an employee name containing a comma', async () => {
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: 'e1', employeeCode: 'ENG-0001', firstName: 'Rao, Jr.', lastName: 'Asha' }]),
    );
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'e1',
          date: new Date('2026-08-01T00:00:00Z'),
          status: 'absent',
          checkInAt: null,
          checkOutAt: null,
          workingMinutes: 0,
          overtimeMinutes: 0,
        },
      ]),
    );

    const csv = await analyticsService.exportAttendanceCsv({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(csv).toContain('"Rao, Jr. Asha"');
  });

  it('labels a record whose employee no longer resolves as "Unknown" rather than dropping it', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'ghost',
          date: new Date('2026-08-01T00:00:00Z'),
          status: 'present',
          checkInAt: null,
          checkOutAt: null,
          workingMinutes: 0,
          overtimeMinutes: 0,
        },
      ]),
    );

    const csv = await analyticsService.exportAttendanceCsv({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(csv.split('\n')[1]).toContain('Unknown,Unknown,');
  });
});

describe('analyticsService.exportAttendancePdf', () => {
  it('produces a real PDF buffer from the same records exportAttendanceCsv uses', async () => {
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: 'e1', employeeCode: 'ENG-0001', firstName: 'Asha', lastName: 'Rao' }]),
    );
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'e1',
          date: new Date('2026-08-01T00:00:00Z'),
          status: 'present',
          checkInAt: new Date('2026-08-01T09:00:00Z'),
          checkOutAt: new Date('2026-08-01T18:00:00Z'),
          workingMinutes: 480,
          overtimeMinutes: 0,
        },
      ]),
    );

    const buffer = await analyticsService.exportAttendancePdf({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('shares fetchExportRecords with the CSV export — same 5000-row cap applies', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));
    const query = mockQuery([]);
    mockedAttendanceFind.mockReturnValue(query);

    await analyticsService.exportAttendancePdf({
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(query.limit).toHaveBeenCalledWith(5000);
  });
});

describe('analyticsService caching (Phase 17)', () => {
  it('serves a repeated getDashboardKpis call from cache without re-querying', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1')));
    mockedAttendanceFind.mockReturnValue(mockQuery([{ status: 'present' }]));

    const first = await analyticsService.getDashboardKpis(hr, {});
    const second = await analyticsService.getDashboardKpis(hr, {});

    expect(second).toEqual(first);
    expect(mockedEmployeeFind).toHaveBeenCalledTimes(1);
    expect(mockedAttendanceFind).toHaveBeenCalledTimes(1);
  });

  it('never shares a cache entry between two different managers', async () => {
    const managerA: ActorContext = { id: 'user-a', role: 'manager', employeeId: 'mgr-a' };
    const managerB: ActorContext = { id: 'user-b', role: 'manager', employeeId: 'mgr-b' };
    mockedEmployeeFind
      .mockReturnValueOnce(mockQuery(employeeRows('a1'))) // manager A's team
      .mockReturnValueOnce(mockQuery(employeeRows('b1', 'b2'))); // manager B's team
    mockedAttendanceFind.mockReturnValue(mockQuery([]));

    const resultA = await analyticsService.getDashboardKpis(managerA, {});
    const resultB = await analyticsService.getDashboardKpis(managerB, {});

    expect(resultA.headcount).toBe(1);
    expect(resultB.headcount).toBe(2);
    expect(mockedEmployeeFind).toHaveBeenCalledTimes(2); // both actually queried, no cross-manager reuse
  });

  it('never caches a rejected (FORBIDDEN) call — every call to an unauthorized role re-throws', async () => {
    await expect(analyticsService.getDashboardKpis(employeeActor, {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(analyticsService.getDashboardKpis(employeeActor, {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });

  it('serves a repeated getDepartmentComparison call from cache without re-querying', async () => {
    mockedDepartmentFind.mockReturnValue(mockQuery([{ _id: 'dept-1', name: 'Ops' }]));
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows('e1')));
    mockedAttendanceFind.mockReturnValue(mockQuery([{ status: 'present' }]));

    const first = await analyticsService.getDepartmentComparison({});
    const second = await analyticsService.getDepartmentComparison({});

    expect(second).toEqual(first);
    expect(mockedDepartmentFind).toHaveBeenCalledTimes(1);
  });
});
