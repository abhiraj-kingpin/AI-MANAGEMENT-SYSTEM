import { logger } from '../../config/logger';
import { listBusinessDays } from '../../shared/utils/businessDays';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { Employee } from '../employees/employee.model';
import { getHolidayDatesInRange } from '../leaves/holiday.service';
import { Attendance } from './attendance.model';

export interface AbsenceSweepResultDTO {
  date: string; // 'YYYY-MM-DD'
  employeesMarkedAbsent: number;
  skippedReason: 'weekend_or_holiday' | null;
}

/**
 * Marks every active employee with no Attendance record for `date` as
 * `absent` — the sweep backend/README.md's "Other known, documented gaps"
 * used to flag as missing: `Attendance` has always had an `absent` status
 * in its schema, but nothing ever created one.
 *
 * Skips weekends/holidays entirely, via the same `listBusinessDays` leave
 * balance math already uses (see leave.service.ts) — nobody is "absent" on
 * a day nobody was expected to work.
 *
 * An approved leave already creates an `on_leave` Attendance stub for every
 * day it covers (leave.service.ts#markAttendanceOnLeave), so this sweep
 * genuinely only catches employees with *no* record at all for the day —
 * a real, uncovered no-show, not someone on approved leave, not someone who
 * already checked in.
 *
 * Uses per-employee `updateOne` + `$setOnInsert` + `upsert: true` (not
 * `insertMany`) for the same race-safety reason `markAttendanceOnLeave`
 * does: `$setOnInsert` only applies when no document exists yet, so a real
 * check-in landing concurrently between this sweep reading "who's missing"
 * and writing the absent stub always wins — never overwritten to "absent".
 */
export async function runAbsenceSweep(date: Date): Promise<AbsenceSweepResultDTO> {
  const day = startOfUtcDay(date);
  const isoDate = day.toISOString().slice(0, 10);

  const holidayDates = await getHolidayDatesInRange(day, day);
  const businessDays = listBusinessDays(day, day, holidayDates);
  if (businessDays.length === 0) {
    return { date: isoDate, employeesMarkedAbsent: 0, skippedReason: 'weekend_or_holiday' };
  }

  const activeEmployees = await Employee.find({ status: 'active' }).select('_id');
  const employeeIds = activeEmployees.map((e) => String(e._id));
  if (employeeIds.length === 0) {
    return { date: isoDate, employeesMarkedAbsent: 0, skippedReason: null };
  }

  const existing = await Attendance.find({
    employeeId: { $in: employeeIds },
    date: day,
  }).select('employeeId');
  const existingSet = new Set(existing.map((a) => String(a.employeeId)));

  const missing = employeeIds.filter((id) => !existingSet.has(id));

  await Promise.all(
    missing.map((employeeId) =>
      Attendance.updateOne(
        { employeeId, date: day },
        { $setOnInsert: { employeeId, date: day, method: 'manual', status: 'absent' } },
        { upsert: true },
      ),
    ),
  );

  logger.info(`Absence sweep for ${isoDate} complete`, { employeesMarkedAbsent: missing.length });

  return { date: isoDate, employeesMarkedAbsent: missing.length, skippedReason: null };
}
