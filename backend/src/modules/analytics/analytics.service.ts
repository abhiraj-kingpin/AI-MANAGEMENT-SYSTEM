import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import { requireEmployeeId } from '../../shared/utils/actor';
import { countBusinessDays } from '../../shared/utils/businessDays';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { round2 } from '../../shared/utils/math';
import { Attendance } from '../attendance/attendance.model';
import { Department } from '../departments/department.model';
import { Employee } from '../employees/employee.model';
import { getHolidayDatesInRange } from '../leaves/holiday.service';
import type {
  AttendanceTrendPointDTO,
  DashboardKpisDTO,
  DepartmentComparisonDTO,
} from './analytics.types';
import type {
  AttendanceTrendQuery,
  DashboardKpisQuery,
  DepartmentComparisonQuery,
  ExportAttendanceCsvQuery,
} from './analytics.validators';

// A day is "worked" whether the employee was on time or late, or only
// managed half a day — only 'absent'/no-record and 'on_leave' are excluded
// from attendanceRate. Kept as a Set so both getDashboardKpis and
// getAttendanceTrend read the exact same definition of "present".
const PRESENT_STATUSES = new Set(['present', 'late', 'half_day']);

/**
 * The employee ids an analytics caller is allowed to see, given their role
 * and an optional department filter — the same route-vs-service split (role
 * branching lives here, not in the route) used by leave.service.ts#list and
 * employee.service.ts#listEmployees. An `employee` never gets an org- or
 * team-level view; a `manager` is scoped to their own direct reports.
 * Exported for reuse by analytics.ai.service.ts (Phase 15), which scopes its
 * late-risk and absenteeism-trend views the same way.
 */
export async function resolveEmployeeIds(
  actor: ActorContext,
  departmentId?: string,
): Promise<string[]> {
  if (actor.role === 'employee') {
    throw AppError.forbidden('You do not have permission to view analytics.', 'FORBIDDEN');
  }

  const filter: Record<string, unknown> = { isDeleted: false };
  if (actor.role === 'manager') {
    filter.managerId = requireEmployeeId(actor);
  }
  if (departmentId) {
    filter.departmentId = departmentId;
  }

  const employees = await Employee.find(filter).select('_id');
  return employees.map((e) => String(e._id));
}

/** Counts of present/late/on-leave records within `statuses` — the same tally reused for one day (dashboard) and one department (comparison). */
function tallyStatuses(records: Array<{ status: string }>): {
  presentCount: number;
  lateCount: number;
  onLeaveCount: number;
} {
  let presentCount = 0;
  let lateCount = 0;
  let onLeaveCount = 0;
  for (const record of records) {
    if (PRESENT_STATUSES.has(record.status)) presentCount += 1;
    if (record.status === 'late') lateCount += 1;
    if (record.status === 'on_leave') onLeaveCount += 1;
  }
  return { presentCount, lateCount, onLeaveCount };
}

/** Wraps a field in quotes (doubling embedded quotes) only when it contains a comma, quote, or newline — the minimal correct CSV-escaping rule (RFC 4180). */
function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export const analyticsService = {
  /** One day's headcount + attendance/late/leave rates for the caller's scope. Real aggregation over Attendance/Employee — nothing here is invented. */
  async getDashboardKpis(actor: ActorContext, query: DashboardKpisQuery): Promise<DashboardKpisDTO> {
    const day = startOfUtcDay(query.date ?? new Date());
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    const headcount = employeeIds.length;

    if (headcount === 0) {
      return {
        date: day,
        headcount: 0,
        attendanceRate: 0,
        lateRate: 0,
        leaveRate: 0,
        presentCount: 0,
        lateCount: 0,
        onLeaveCount: 0,
      };
    }

    const records = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: day,
    }).select('status');

    const { presentCount, lateCount, onLeaveCount } = tallyStatuses(records);

    return {
      date: day,
      headcount,
      attendanceRate: round2((presentCount / headcount) * 100),
      lateRate: round2((lateCount / headcount) * 100),
      leaveRate: round2((onLeaveCount / headcount) * 100),
      presentCount,
      lateCount,
      onLeaveCount,
    };
  },

  /**
   * One point per month for the trailing `months` months (default 6),
   * scoped the same way as getDashboardKpis. Rates are attendance /
   * expected-working-days — expected working days come from
   * shared/utils/businessDays.ts (weekdays minus holidays), the same
   * denominator leave balances are computed against, not just calendar days.
   */
  async getAttendanceTrend(
    actor: ActorContext,
    query: AttendanceTrendQuery,
  ): Promise<AttendanceTrendPointDTO[]> {
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    if (employeeIds.length === 0) return [];

    const months = query.months;
    const now = new Date();
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const objectIds = employeeIds.map((id) => new Types.ObjectId(id));
    const buckets = await Attendance.aggregate<{
      _id: string;
      presentCount: number;
      lateCount: number;
    }>([
      { $match: { employeeId: { $in: objectIds }, date: { $gte: rangeStart, $lte: rangeEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          presentCount: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'half_day']] }, 1, 0] },
          },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        },
      },
    ]);
    const byMonth = new Map(buckets.map((b) => [b._id, b]));

    const holidayDates = await getHolidayDatesInRange(rangeStart, rangeEnd);

    const points: AttendanceTrendPointDTO[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
      const month = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;

      const workingDays = countBusinessDays(monthStart, monthEnd, holidayDates);
      const expected = workingDays * employeeIds.length;
      const bucket = byMonth.get(month);

      points.push({
        month,
        attendanceRate: expected === 0 ? 0 : round2(((bucket?.presentCount ?? 0) / expected) * 100),
        lateRate: expected === 0 ? 0 : round2(((bucket?.lateCount ?? 0) / expected) * 100),
      });
    }

    return points;
  },

  /** One day's headcount + rates per active department — an org-wide report (HR/Admin only, gated at the route), not team-scoped. */
  async getDepartmentComparison(
    query: DepartmentComparisonQuery,
  ): Promise<DepartmentComparisonDTO[]> {
    const day = startOfUtcDay(query.date ?? new Date());
    const departments = await Department.find({ isActive: true }).select('name');

    return Promise.all(
      departments.map(async (dept) => {
        const employees = await Employee.find({
          departmentId: dept._id,
          isDeleted: false,
        }).select('_id');
        const headcount = employees.length;

        if (headcount === 0) {
          return {
            departmentId: String(dept._id),
            departmentName: dept.name,
            headcount: 0,
            attendanceRate: 0,
            lateRate: 0,
          };
        }

        const records = await Attendance.find({
          employeeId: { $in: employees.map((e) => e._id) },
          date: day,
        }).select('status');
        const { presentCount, lateCount } = tallyStatuses(records);

        return {
          departmentId: String(dept._id),
          departmentName: dept.name,
          headcount,
          attendanceRate: round2((presentCount / headcount) * 100),
          lateRate: round2((lateCount / headcount) * 100),
        };
      }),
    );
  },

  /** Raw per-record attendance export for a date range — an org-wide report (HR/Admin only, gated at the route). */
  async exportAttendanceCsv(query: ExportAttendanceCsvQuery): Promise<string> {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (query.departmentId) filter.departmentId = query.departmentId;

    const employees = await Employee.find(filter).select('employeeCode firstName lastName');
    const employeeById = new Map(employees.map((e) => [String(e._id), e]));

    const records = await Attendance.find({
      employeeId: { $in: employees.map((e) => e._id) },
      date: { $gte: startOfUtcDay(query.from), $lte: startOfUtcDay(query.to) },
    }).sort({ date: 1, employeeId: 1 });

    const header = 'Employee Code,Employee Name,Date,Status,Check In,Check Out,Working Minutes,Overtime Minutes';
    const rows = records.map((record) => {
      const employee = employeeById.get(String(record.employeeId));
      const name = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
      const code = employee?.employeeCode ?? 'Unknown';
      return [
        code,
        escapeCsvField(name),
        record.date.toISOString().slice(0, 10),
        record.status,
        record.checkInAt ? record.checkInAt.toISOString() : '',
        record.checkOutAt ? record.checkOutAt.toISOString() : '',
        String(record.workingMinutes),
        String(record.overtimeMinutes),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  },
};
