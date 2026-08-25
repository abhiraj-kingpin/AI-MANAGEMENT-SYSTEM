import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { LiveClock } from '@/shared/ui/LiveClock';
import { Reveal } from '@/shared/ui/Reveal';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import { useSearchStore } from '@/stores/searchStore';
import type { Attendance, AttendanceMethod } from '@/types/api';

type LiveState = 'working' | 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave' | 'checkedOut';

const STATE_DEFS: Array<{ key: LiveState; label: string; dot: string }> = [
  { key: 'working', label: 'Currently working', dot: 'bg-success' },
  { key: 'checkedIn', label: 'Checked in', dot: 'bg-accent' },
  { key: 'late', label: 'Late', dot: 'bg-warning' },
  { key: 'notCheckedIn', label: 'Not checked in', dot: 'bg-text-faint' },
  { key: 'onLeave', label: 'On leave', dot: 'bg-accent-2' },
  { key: 'checkedOut', label: 'Checked out', dot: 'bg-text-dim' },
];

const METHOD_LABEL: Record<AttendanceMethod, string> = {
  gps: 'GPS',
  qr: 'QR',
  face: 'Face',
  manual: 'Manual',
};

const METHOD_TONE: Record<AttendanceMethod, string> = {
  gps: 'bg-accent-2/10 text-accent-2',
  qr: 'bg-success/10 text-success',
  face: 'bg-warning/10 text-warning',
  manual: 'bg-text-dim/10 text-text-dim',
};

function matchesState(record: Attendance, state: LiveState): boolean {
  switch (state) {
    case 'working':
      return !!record.checkInAt && !record.checkOutAt;
    case 'checkedIn':
      return !!record.checkInAt;
    case 'late':
      return record.status === 'late';
    case 'notCheckedIn':
      return !record.checkInAt && record.status !== 'on_leave';
    case 'onLeave':
      return record.status === 'on_leave';
    case 'checkedOut':
      return !!record.checkOutAt;
  }
}

function formatDuration(startIso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LiveAttendancePage() {
  const [active, setActive] = useState<LiveState | null>(null);
  const date = today();

  // A 15s refetch reads as "live" without a per-second network hit, and —
  // per the isolated-clock rule above — this page's own re-render doesn't
  // ride on the header clock's per-second tick.
  const { data, isLoading, isError } = useAttendance({ from: date, to: date, limit: 100 });
  const { data: geofences } = useGeofences(true);
  const geofenceName = useMemo(
    () => new Map((geofences ?? []).map((g) => [g.id, g.branchName])),
    [geofences],
  );

  // Attendance rows only carry an employee summary (name/code), not
  // department — joined client-side from the roster rather than adding a
  // populate the backend doesn't otherwise need for this endpoint.
  const { data: employees } = useEmployees({ page: 1, limit: 200 });
  const departmentByEmployee = useMemo(
    () => new Map((employees?.items ?? []).map((e) => [e.id, e.department?.name ?? '—'])),
    [employees],
  );

  const records = data?.items ?? [];
  const counts = useMemo(() => {
    const c: Record<LiveState, number> = {
      working: 0,
      checkedIn: 0,
      late: 0,
      notCheckedIn: 0,
      onLeave: 0,
      checkedOut: 0,
    };
    for (const record of records) {
      for (const def of STATE_DEFS) {
        if (matchesState(record, def.key)) c[def.key] += 1;
      }
    }
    return c;
  }, [records]);

  const searchQuery = useSearchStore((s) => s.query);
  const visible = records.filter((record) => {
    if (active && !matchesState(record, active)) return false;
    return matchesQuery(searchQuery, record.employee?.firstName, record.employee?.lastName, record.employee?.employeeCode);
  });

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Time &amp; Attendance
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Live Attendance</h1>
          <p className="mt-1 text-[12.5px] font-medium text-text-dim">
            Today, updating as people check in and out
          </p>
        </div>
      </Reveal>

      <Reveal index={1}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATE_DEFS.map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => setActive((prev) => (prev === def.key ? null : def.key))}
              className={`rounded-card border p-4 text-left transition-colors ${
                active === def.key
                  ? 'border-accent/50 bg-accent/[0.06] shadow-[0_4px_16px_rgba(20,48,79,0.12)]'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${def.dot}`} />
                <span className="text-[10.5px] font-bold tracking-[0.03em] text-text-dim uppercase">
                  {def.label}
                </span>
              </div>
              <div className="mt-2.5 font-mono text-[26px] font-extrabold tabular-nums">
                {counts[def.key]}
              </div>
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <h2 className="flex-1 text-[15px] font-bold">
              {active ? STATE_DEFS.find((d) => d.key === active)?.label : 'Everyone'} · updating live
            </h2>
            <LiveClock className="text-[12px] text-text-dim" />
          </div>

          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load today's attendance. Try refreshing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Name</th>
                    <th className="px-5 py-3.5 font-bold">Department</th>
                    <th className="px-5 py-3.5 font-bold">Check-in</th>
                    <th className="px-5 py-3.5 font-bold">Duration</th>
                    <th className="px-5 py-3.5 font-bold">Method</th>
                    <th className="px-5 py-3.5 font-bold">Location / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        No one matches that filter.
                      </td>
                    </tr>
                  ) : (
                    visible.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                      >
                        <td className="px-5 py-3.5">
                          {record.employee ? (
                            <>
                              <div className="font-semibold text-text">
                                {record.employee.firstName} {record.employee.lastName}
                              </div>
                              <div className="font-mono text-[12px] tabular-nums text-text-dim">
                                {record.employee.employeeCode}
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {departmentByEmployee.get(record.employeeId) ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-text-dim">
                          {record.checkInAt
                            ? new Date(record.checkInAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 font-mono tabular-nums font-medium">
                          {record.checkInAt && !record.checkOutAt
                            ? formatDuration(record.checkInAt)
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-[8px] px-2 py-1 text-[10.5px] font-bold ${METHOD_TONE[record.method]}`}
                          >
                            {METHOD_LABEL[record.method]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2.5 text-right">
                            <span className="text-[11.5px] font-semibold text-text-dim">
                              {record.geofenceId ? (geofenceName.get(record.geofenceId) ?? '—') : '—'}
                            </span>
                            <Chip
                              tone={
                                record.status === 'absent'
                                  ? 'danger'
                                  : record.status === 'late'
                                    ? 'warning'
                                    : record.status === 'on_leave'
                                      ? 'neutral'
                                      : 'success'
                              }
                            >
                              {matchesState(record, 'working')
                                ? 'On duty'
                                : record.status.replace('_', ' ')}
                            </Chip>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
