import { logger } from '../../config/logger';
import { listBusinessDays } from '../../shared/utils/businessDays';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { Employee } from '../employees/employee.model';
import { getHolidayDatesInRange } from '../leaves/holiday.service';
import { Attendance } from './attendance.model';

export interface AbsenceSweepResultDTO {
  date: string;
  employeesMarkedAbsent: number;
  skippedReason: 'weekend_or_holiday' | null;
}

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
