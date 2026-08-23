import { startOfUtcDay } from './dateTime';

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

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

export function countBusinessDays(start: Date, end: Date, holidayDates: Date[] = []): number {
  return listBusinessDays(start, end, holidayDates).length;
}
