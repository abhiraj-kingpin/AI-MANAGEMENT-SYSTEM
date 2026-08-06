import { startOfUtcDay } from './dateTime';

/** Mon-Sun as returned by `Date#getUTCDay()`: 0 = Sunday, 6 = Saturday. */
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Every business day (Mon-Fri, minus the given holidays) between start and end, inclusive. */
export function listBusinessDays(start: Date, end: Date, holidayDates: Date[] = []): Date[] {
  const holidaySet = new Set(holidayDates.map((d) => startOfUtcDay(d).getTime()));
  const days: Date[] = [];
  const cursor = startOfUtcDay(start);
  const endDay = startOfUtcDay(end);

  while (cursor.getTime() <= endDay.getTime()) {
    if (!isWeekend(cursor) && !holidaySet.has(cursor.getTime())) {
      days.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/** Count of business days between start and end, inclusive — what `totalDays` on a Leave is computed from. */
export function countBusinessDays(start: Date, end: Date, holidayDates: Date[] = []): number {
  return listBusinessDays(start, end, holidayDates).length;
}
