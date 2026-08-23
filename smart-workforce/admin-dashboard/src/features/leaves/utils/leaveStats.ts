import type { Leave } from '@/types/api';

export interface LeaveSummary {
  pending: number;
  onLeaveToday: number;
  upcoming: number;
  approvedThisMonth: number;
}

function isSameDayOrBetween(day: Date, startIso: string, endIso: string): boolean {
  const start = new Date(startIso.slice(0, 10));
  const end = new Date(endIso.slice(0, 10));
  const d = new Date(day.toISOString().slice(0, 10));
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

export function computeLeaveSummary(leaves: Leave[], now = new Date()): LeaveSummary {
  const today = new Date(now.toISOString().slice(0, 10));

  let pending = 0;
  let onLeaveToday = 0;
  let upcoming = 0;
  let approvedThisMonth = 0;

  for (const leave of leaves) {
    if (leave.status === 'pending') pending++;

    if (leave.status === 'approved') {
      if (isSameDayOrBetween(today, leave.startDate, leave.endDate)) onLeaveToday++;
      if (new Date(leave.startDate.slice(0, 10)).getTime() > today.getTime()) upcoming++;

      const updated = new Date(leave.updatedAt);
      if (updated.getFullYear() === now.getFullYear() && updated.getMonth() === now.getMonth()) {
        approvedThisMonth++;
      }
    }
  }

  return { pending, onLeaveToday, upcoming, approvedThisMonth };
}
