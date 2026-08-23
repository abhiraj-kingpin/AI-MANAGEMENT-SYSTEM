import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import type { Leave, LeaveStatus } from '@/types/api';

const STATUS_DOT: Record<LeaveStatus, string> = {
  approved: 'bg-success',
  pending: 'bg-warning',
  rejected: 'bg-danger',
  cancelled: 'bg-text-dim',
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

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

interface LeaveCalendarProps {
  leaves: Leave[];
}

export function LeaveCalendar({ leaves }: LeaveCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const byDay = useMemo(() => {
    const map = new Map<string, Leave[]>();
    for (const leave of leaves) {
      if (leave.status === 'cancelled') continue;
      for (const key of leaveDayKeys(leave)) {
        const existing = map.get(key);
        if (existing) existing.push(leave);
        else map.set(key, [leave]);
      }
    }
    return map;
  }, [leaves]);

  const first = startOfMonth(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Sun..6=Sat; shift so the grid starts on Monday.
  const leadingBlanks = (first.getDay() + 6) % 7;

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null });
  for (let day = 1; day <= daysInMonth; day++) cells.push({ date: new Date(year, month, day) });

  const goToMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = toKey(now);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-bold">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded-lg border border-border px-2.5 py-1 text-[12.5px] hover:bg-ink/[0.05]"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
            }}
            className="rounded-lg border border-border px-2.5 py-1 text-[12.5px] hover:bg-ink/[0.05]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded-lg border border-border px-2.5 py-1 text-[12.5px] hover:bg-ink/[0.05]"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-[11px] font-bold tracking-wide text-text-dim uppercase">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`blank-${i}`} className="min-h-[92px] border-b border-r border-border/40" />;
          }
          const key = toKey(cell.date);
          const dayLeaves = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`min-h-[92px] border-b border-r border-border/40 p-1.5 ${
                isToday ? 'bg-accent/[0.06]' : ''
              }`}
            >
              <div
                className={`mb-1 text-[12px] ${
                  isToday ? 'font-extrabold text-accent-light' : 'text-text-dim'
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayLeaves.slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    title={`${leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Employee'} — ${leave.leaveTypeName ?? 'Leave'} (${leave.status})`}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10.5px] text-text-dim"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[leave.status]}`} />
                    <span className="truncate">
                      {leave.employee ? leave.employee.lastName : 'Employee'}
                    </span>
                  </div>
                ))}
                {dayLeaves.length > 3 && (
                  <div className="px-1 text-[10px] text-text-dim">+{dayLeaves.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border px-5 py-3 text-[12px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> Rejected
        </span>
      </div>
    </Card>
  );
}
