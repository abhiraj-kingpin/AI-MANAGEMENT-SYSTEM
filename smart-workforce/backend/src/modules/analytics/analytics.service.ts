import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { analyticsCache } from '../../shared/cache/memoryCache';
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

const PRESENT_STATUSES = new Set(['present', 'late', 'half_day']);

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

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function fetchExportRecords(query: ExportAttendanceCsvQuery) {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (query.departmentId) filter.departmentId = query.departmentId;

  const employees = await Employee.find(filter).select('employeeCode firstName lastName');
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  const records = await Attendance.find({
    employeeId: { $in: employees.map((e) => e._id) },
    date: { $gte: startOfUtcDay(query.from), $lte: startOfUtcDay(query.to) },
  })
    .sort({ date: 1, employeeId: 1 })
    .limit(5000);

  return { records, employeeById };
}

const DASHBOARD_CACHE_TTL_MS = 30_000;
const DEPARTMENT_COMPARISON_CACHE_TTL_MS = 30_000;

function dashboardCacheKey(
  actor: ActorContext,
  departmentId: string | undefined,
  day: Date,
): string {
  const scope = actor.role === 'manager' ? `manager:${actor.employeeId}` : actor.role;
  return `dashboard:${scope}:${departmentId ?? 'all'}:${day.toISOString()}`;
}

export const analyticsService = {
  async getDashboardKpis(
    actor: ActorContext,
    query: DashboardKpisQuery,
  ): Promise<DashboardKpisDTO> {
    const day = startOfUtcDay(query.date ?? new Date());
    const cacheKey = dashboardCacheKey(actor, query.departmentId, day);

    return analyticsCache.getOrSet(cacheKey, DASHBOARD_CACHE_TTL_MS, async () => {
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
    });
  },

  async getAttendanceTrend(
    actor: ActorContext,
    query: AttendanceTrendQuery,
  ): Promise<AttendanceTrendPointDTO[]> {
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    if (employeeIds.length === 0) return [];

    const months = query.months;
    const now = new Date();
    const rangeStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
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
      const monthEnd = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
      );
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

  async getDepartmentComparison(
    query: DepartmentComparisonQuery,
  ): Promise<DepartmentComparisonDTO[]> {
    const day = startOfUtcDay(query.date ?? new Date());
    const cacheKey = `department-comparison:${day.toISOString()}`;

    return analyticsCache.getOrSet(cacheKey, DEPARTMENT_COMPARISON_CACHE_TTL_MS, async () => {
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
    });
  },

  async exportAttendanceCsv(query: ExportAttendanceCsvQuery): Promise<string> {
    const { records, employeeById } = await fetchExportRecords(query);

    const header =
      'Employee Code,Employee Name,Date,Status,Check In,Check Out,Working Minutes,Overtime Minutes';
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

  async exportAttendancePdf(query: ExportAttendanceCsvQuery): Promise<Buffer> {
    const { records, employeeById } = await fetchExportRecords(query);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Attendance Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(9);

      const headers = [
        'Code',
        'Employee',
        'Date',
        'Status',
        'Check In',
        'Check Out',
        'Minutes',
        'OT (min)',
      ];
      const colWidths = [60, 130, 70, 60, 90, 90, 60, 60];
      const left = 40;

      const drawRow = (cells: string[]) => {
        const y = doc.y;
        cells.forEach((cell, i) => {
          const x = left + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(cell, x, y, { width: colWidths[i] });
        });
        doc.moveDown();
      };

      doc.font('Helvetica-Bold');
      drawRow(headers);
      doc.font('Helvetica');

      for (const record of records) {
        const employee = employeeById.get(String(record.employeeId));
        drawRow([
          employee?.employeeCode ?? 'Unknown',
          employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          record.date.toISOString().slice(0, 10),
          record.status,
          record.checkInAt ? record.checkInAt.toISOString().slice(0, 16).replace('T', ' ') : '-',
          record.checkOutAt ? record.checkOutAt.toISOString().slice(0, 16).replace('T', ' ') : '-',
          String(record.workingMinutes),
          String(record.overtimeMinutes),
        ]);
      }

      doc.end();
    });
  },
};
