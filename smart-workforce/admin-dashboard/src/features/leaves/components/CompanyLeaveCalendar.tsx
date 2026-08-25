import { useMemo } from 'react';
import type { Holiday, Leave } from '@/types/api';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function leaveDayKeys(leave: Leave): string[] {
  const start = new Date(leave.startDate.slice(0, 10));
  const end = new Date(leave.endDate.slice(0, 10));
  const keys: string[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    keys.push(toKey(d));
  }
  return keys;
}

function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

interface Props {
  year: number;
  month: number;
  leaves: Leave[];
  holidays: Holiday[];
}

/** Company-wide, not the per-employee dot-and-lastname grid on the Leave
 *  page (LeaveCalendar.tsx) — this one shows initial chips per person,
 *  colored by approved/pending, plus holidays mixed into the same cells. */
export function CompanyLeaveCalendar({ year, month, leaves, holidays }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, Leave[]>();
    for (const leave of leaves) {
      if (leave.status === 'cancelled' || leave.status === 'rejected') continue;
      for (const key of leaveDayKeys(leave)) {
        const existing = map.get(key);
        if (existing) existing.push(leave);
        else map.set(key, [leave]);
      }
    }
    return map;
  }, [leaves]);

  const holidayByDay = useMemo(
    () => new Map(holidays.map((h) => [h.date.slice(0, 10), h])),
    [holidays],
  );

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7;

  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));

  const todayKey = toKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 border-b border-border pb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] font-bold tracking-wide text-text-faint uppercase">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} className="min-h-[92px]" />;
          const key = toKey(date);
          const dayLeaves = byDay.get(key) ?? [];
          const holiday = holidayByDay.get(key);
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`min-h-[92px] rounded-xl border p-1.5 ${
                isToday ? 'border-accent/40 bg-accent/[0.05]' : 'border-border/60'
              }`}
            >
              <div className={`text-[11.5px] font-bold ${isToday ? 'text-accent-light' : 'text-text-dim'}`}>
                {date.getDate()}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {holiday && (
                  <span
                    title={holiday.name}
                    className="rounded-[6px] bg-accent-2/10 px-1.5 py-0.5 text-[9.5px] font-bold text-accent-2"
                  >
                    {holiday.name.length > 10 ? `${holiday.name.slice(0, 9)}…` : holiday.name}
                  </span>
                )}
                {dayLeaves.slice(0, 5).map((leave) => (
                  <span
                    key={leave.id}
                    title={`${leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Employee'} — ${leave.leaveTypeName ?? 'Leave'} (${leave.status})`}
                    className={`grid h-5 w-5 place-items-center rounded-full text-[8.5px] font-extrabold ${
                      leave.status === 'approved' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {leave.employee ? initialsOf(leave.employee.firstName, leave.employee.lastName) : '?'}
                  </span>
                ))}
                {dayLeaves.length > 5 && (
                  <span className="text-[9.5px] font-bold text-text-faint">+{dayLeaves.length - 5}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
