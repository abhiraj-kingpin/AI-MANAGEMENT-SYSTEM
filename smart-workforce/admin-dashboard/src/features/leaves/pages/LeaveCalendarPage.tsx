import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { Select } from '@/shared/ui/Field';
import { CompanyLeaveCalendar } from '@/features/leaves/components/CompanyLeaveCalendar';
import { useHolidays } from '@/features/leaves/hooks/useHolidays';
import { useLeaveOverview } from '@/features/leaves/hooks/useLeaveOverview';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { useLeaveTypes } from '@/features/leaveTypes/hooks/useLeaveTypes';
import { useAuthStore } from '@/stores/authStore';
import type { LeaveStatus } from '@/types/api';

const STATUS_OPTIONS: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

export function LeaveCalendarPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [departmentId, setDepartmentId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [status, setStatus] = useState<LeaveStatus | ''>('');

  const { data: overview } = useLeaveOverview(canView);
  const { data: holidaysAll } = useHolidays(year);
  const { data: departments } = useDepartments();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: employees } = useEmployees({ page: 1, limit: 200 });

  const departmentByEmployee = useMemo(
    () => new Map((employees?.items ?? []).map((e) => [e.id, e.department?.id ?? null])),
    [employees],
  );

  const leaves = (overview?.items ?? []).filter((leave) => {
    if (status && leave.status !== status) return false;
    if (leaveTypeId && leave.leaveTypeId !== leaveTypeId) return false;
    if (departmentId && departmentByEmployee.get(leave.employeeId) !== departmentId) return false;
    return true;
  });

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const upcomingHolidays = (holidaysAll ?? [])
    .filter((h) => new Date(h.date).getTime() >= now.setHours(0, 0, 0, 0))
    .slice(0, 6);

  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Time &amp; Attendance
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Leave Calendar</h1>
        </Reveal>
        <Reveal index={1}>
          <Card className="p-14 text-center text-sm text-text-dim">
            This console is for reviewing everyone's leave coverage.
          </Card>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Time &amp; Attendance
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Leave Calendar</h1>
        <p className="mt-1 text-[12.5px] font-medium text-text-dim">Company-wide coverage, month by month</p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Reveal index={1}>
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="flex-1 text-[15px] font-bold">{monthLabel}</h2>
              <div className="flex items-center gap-3.5 text-[11px] font-semibold text-text-dim">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" /> Approved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" /> Pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-2" /> Holiday
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => goMonth(-1)}
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
                  onClick={() => goMonth(1)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[12.5px] hover:bg-ink/[0.05]"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>
            <CompanyLeaveCalendar year={year} month={month} leaves={leaves} holidays={holidaysAll ?? []} />
          </Card>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal index={2}>
            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-bold">Filters</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">Department</p>
                  <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">All departments</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">Leave type</p>
                  <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
                    <option value="">All types</option>
                    {leaveTypes?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">Status</p>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as LeaveStatus | '')}>
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">Month</p>
                  <input
                    type="month"
                    value={`${year}-${String(month + 1).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [y, m] = e.target.value.split('-').map(Number);
                      if (y && m) {
                        setYear(y);
                        setMonth(m - 1);
                      }
                    }}
                    className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[13.5px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
                  />
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal index={3}>
            <Card className="p-5">
              <h2 className="text-[15px] font-bold">Upcoming holidays</h2>
              <p className="mt-0.5 mb-3 text-[11.5px] font-medium text-text-dim">Company calendar</p>
              {upcomingHolidays.length === 0 ? (
                <p className="py-4 text-center text-[12.5px] text-text-dim">No upcoming holidays on file.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {upcomingHolidays.map((h) => {
                    const d = new Date(h.date);
                    return (
                      <div key={h.id} className="flex items-center gap-3 py-2.5">
                        <div className="w-9 shrink-0 text-center">
                          <div className="font-mono text-[13px] font-extrabold tabular-nums">{d.getDate()}</div>
                          <div className="text-[9px] font-bold text-text-dim uppercase">
                            {d.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </div>
                        <div className="flex-1 text-[12.5px] font-semibold text-text">{h.name}</div>
                        {h.isOptional && (
                          <span className="rounded-pill bg-text-dim/10 px-2 py-0.5 text-[10px] font-bold text-text-dim">
                            Optional
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
