/**
 * Date-normalization helpers for attendance. Everything here operates in
 * UTC — proper per-branch local-timezone handling (an office in Mumbai vs.
 * one in London recording "today" differently) is a Phase 6 concern, once
 * Geofence records carry a timezone. Documented simplification, not a
 * silent one: see docs/architecture/03-database-schema.md#attendances.
 */

/** Truncates to 00:00:00.000 UTC of the same calendar day — the value stored in `Attendance.date`. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfUtcDay(date: Date): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** Combines a UTC calendar day with an "HH:mm" time-of-day string (as stored on `Shift`). */
export function combineDateAndTime(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const base = startOfUtcDay(date);
  return new Date(base.getTime() + (hours * 60 + minutes) * 60_000);
}

/**
 * Minutes between two "HH:mm" times, wrapping past midnight when `end` is
 * earlier than `start` — e.g. a night shift `22:00`–`06:00` is 480 minutes,
 * not a negative number. Used to derive a shift's standard workday length
 * (for overtime/half-day thresholds) from its `startTime`/`endTime` alone.
 */
export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;
  const diff = end - start;
  return diff > 0 ? diff : diff + 24 * 60;
}
