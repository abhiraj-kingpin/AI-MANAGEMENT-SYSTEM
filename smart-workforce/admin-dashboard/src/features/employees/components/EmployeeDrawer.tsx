import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Chip } from '@/shared/ui/Chip';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useEmployeeDocuments } from '@/features/employees/hooks/useEmployee';
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs';
import { useLeaveQueue } from '@/features/leaves/hooks/useLeaveQueue';
import { usePayslips } from '@/features/payroll/hooks/usePayslips';
import { useRoster } from '@/features/shifts/hooks/useShifts';
import type { Employee, EmploymentStatus } from '@/types/api';

const TABS = ['Overview', 'Attendance', 'Leave', 'Payroll', 'Shift', 'Documents', 'Activity'] as const;
type Tab = (typeof TABS)[number];

const STATUS_TONE: Record<EmploymentStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'warning',
  terminated: 'neutral',
};

function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function KeyValueRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-[12.5px] last:border-0">
      <span className="font-semibold text-text-dim">{k}</span>
      <span className="font-mono tabular-nums font-medium text-text">{v}</span>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 rounded-2xl border border-border p-4">
      <h3 className="text-[13px] font-extrabold">{title}</h3>
      {note && <p className="mt-0.5 mb-1 text-[11.5px] text-text-dim">{note}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function EmployeeDrawer({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const { data: todayAttendance } = useAttendance({ employeeId: employee.id, from: today(), to: today(), limit: 1 });
  const { data: monthAttendance } = useAttendance(
    { employeeId: employee.id, from: firstOfMonth(), to: today(), limit: 31 },
    // Only needed on Overview/Attendance — cheap enough to keep mounted for both.
  );
  const { data: leaves } = useLeaveQueue({ employeeId: employee.id, page: 1, limit: 15 }, tab === 'Leave');
  const { data: payslips } = usePayslips({ employeeId: employee.id, page: 1, limit: 12 }, tab === 'Payroll');
  const { data: roster } = useRoster({ from: today(), to: today() }, tab === 'Shift');
  const { data: documents, isLoading: documentsLoading } = useEmployeeDocuments(employee.id, tab === 'Documents');
  const { data: activity } = useAuditLogs({ entityId: employee.id, page: 1, limit: 20 });

  const record = todayAttendance?.items[0] ?? null;
  const monthRecords = monthAttendance?.items ?? [];
  const monthOnTime = monthRecords.filter((r) => r.status === 'present').length;
  const monthLate = monthRecords.filter((r) => r.status === 'late').length;
  const monthAbsent = monthRecords.filter((r) => r.status === 'absent').length;
  const monthHours = monthRecords.reduce((sum, r) => sum + r.workingMinutes, 0) / 60;

  const myShiftRow = roster?.find((r) => r.employee.id === employee.id);
  const myShiftAssignment = myShiftRow?.assignments.find((a) => {
    const from = a.effectiveFrom.slice(0, 10);
    const to = a.effectiveTo ? a.effectiveTo.slice(0, 10) : null;
    return from <= today() && (!to || to >= today());
  });

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(12,12,20,0.34)]" style={{ animation: 'wp-fade .18s ease' }} />
      <div
        className="absolute top-3.5 right-3.5 bottom-3.5 flex w-[392px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_18px_44px_rgba(12,12,30,0.22)]"
        style={{ animation: 'wp-fade-scale .18s ease' }}
      >
        <div className="flex items-start gap-3 border-b border-border p-5">
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-accent/10 text-[16px] font-extrabold text-accent">
            {initialsOf(employee.firstName, employee.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-extrabold tracking-tight">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] font-medium text-text-dim">
              {employee.designation} · {employee.department?.name ?? '—'}
            </div>
            <div className="mt-1 font-mono text-[10.5px] tabular-nums text-text-faint">
              {employee.employeeCode} · {employee.primaryOffice?.branchName ?? 'No site set'}
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card-subtle text-text-dim hover:bg-ink/[0.06]">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3.5">
          <Chip tone={STATUS_TONE[employee.employmentStatus]}>{employee.employmentStatus.replace('_', ' ')}</Chip>
          {!employee.accountClaimed && <Chip tone="warning">Invited</Chip>}
        </div>

        <div className="flex flex-wrap gap-1 px-5 pt-3">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${
                tab === t ? 'bg-ink text-white' : 'bg-card-subtle text-text-dim hover:bg-ink/[0.06]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'Overview' && (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-border bg-card-subtle p-3">
                  <div className="text-[9.5px] font-bold tracking-[0.03em] text-warning uppercase">Check-in</div>
                  <div className="mt-1.5 font-mono text-[14px] tabular-nums">{formatTime(record?.checkInAt ?? null)}</div>
                </div>
                <div className="rounded-2xl border border-border bg-card-subtle p-3">
                  <div className="text-[9.5px] font-bold tracking-[0.03em] text-danger uppercase">Check-out</div>
                  <div className="mt-1.5 font-mono text-[14px] tabular-nums">{formatTime(record?.checkOutAt ?? null)}</div>
                </div>
                <div className="rounded-2xl border border-border bg-card-subtle p-3">
                  <div className="text-[9.5px] font-bold tracking-[0.03em] text-accent-2 uppercase">Today</div>
                  <div className="mt-1.5 font-mono text-[14px] tabular-nums">
                    {record ? `${(record.workingMinutes / 60).toFixed(1)}h` : '—'}
                  </div>
                </div>
              </div>

              <Panel title="Today's timeline">
                {!record ? (
                  <p className="py-2 text-[12px] text-text-dim">No attendance record yet today.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {record.checkInAt && (
                      <div className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between text-[12px] font-bold">
                            <span>Checked in</span>
                            <span className="font-mono tabular-nums text-text-dim">{formatTime(record.checkInAt)}</span>
                          </div>
                          <div className="text-[11px] text-text-dim">via {record.method}</div>
                        </div>
                      </div>
                    )}
                    {record.checkOutAt && (
                      <div className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-danger" />
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between text-[12px] font-bold">
                            <span>Checked out</span>
                            <span className="font-mono tabular-nums text-text-dim">{formatTime(record.checkOutAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Panel>

              <Panel title="This month">
                <KeyValueRow k="On-time days" v={String(monthOnTime)} />
                <KeyValueRow k="Late days" v={String(monthLate)} />
                <KeyValueRow k="Absent days" v={String(monthAbsent)} />
                <KeyValueRow k="Hours logged" v={`${monthHours.toFixed(1)} h`} />
              </Panel>
            </>
          )}

          {tab === 'Attendance' && (
            <Panel title="Recent attendance" note="This month">
              {monthRecords.length === 0 ? (
                <p className="py-2 text-[12px] text-text-dim">No records this month.</p>
              ) : (
                monthRecords.slice(0, 15).map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border/60 py-2 text-[12px] last:border-0">
                    <span className="font-mono tabular-nums text-text-dim">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-mono tabular-nums">{formatTime(r.checkInAt)}–{formatTime(r.checkOutAt)}</span>
                    <span className="font-bold capitalize">{r.status.replace('_', ' ')}</span>
                  </div>
                ))
              )}
            </Panel>
          )}

          {tab === 'Leave' && (
            <Panel title="Leave requests">
              {!leaves || leaves.items.length === 0 ? (
                <p className="py-2 text-[12px] text-text-dim">No leave requests on file.</p>
              ) : (
                leaves.items.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border-b border-border/60 py-2 text-[12px] last:border-0">
                    <span className="font-bold">{l.leaveTypeName ?? 'Leave'}</span>
                    <span className="font-mono tabular-nums text-text-dim">{l.totalDays}d</span>
                    <span className="capitalize">{l.status}</span>
                  </div>
                ))
              )}
            </Panel>
          )}

          {tab === 'Payroll' && (
            <Panel title="Payslips">
              {!payslips || payslips.items.length === 0 ? (
                <p className="py-2 text-[12px] text-text-dim">No payslips generated yet.</p>
              ) : (
                payslips.items.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-border/60 py-2 text-[12px] last:border-0">
                    <span className="font-mono tabular-nums font-bold">{p.month}</span>
                    <span className="font-mono tabular-nums text-text-dim">{p.netPay.toFixed(2)}</span>
                    <span className="capitalize">{p.status}</span>
                  </div>
                ))
              )}
            </Panel>
          )}

          {tab === 'Shift' && (
            <Panel title="Current shift">
              {!myShiftAssignment ? (
                <p className="py-2 text-[12px] text-text-dim">No shift assigned yet.</p>
              ) : (
                <>
                  <KeyValueRow k="Shift" v={myShiftAssignment.shift.name} />
                  <KeyValueRow k="Window" v={`${myShiftAssignment.shift.startTime}–${myShiftAssignment.shift.endTime}`} />
                  <KeyValueRow k="Effective from" v={new Date(myShiftAssignment.effectiveFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                </>
              )}
            </Panel>
          )}

          {tab === 'Documents' && (
            <Panel title="Documents">
              {documentsLoading ? (
                <p className="py-2 text-[12px] text-text-dim">Loading…</p>
              ) : !documents || documents.length === 0 ? (
                <p className="py-2 text-[12px] text-text-dim">No documents uploaded yet.</p>
              ) : (
                documents.map((d) => (
                  <a
                    key={d.id}
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between border-b border-border/60 py-2 text-[12px] last:border-0 hover:text-accent-light"
                  >
                    <span className="font-bold capitalize">{d.type.replace('_', ' ')}</span>
                    <span className="truncate text-text-dim">{d.fileName ?? 'file'}</span>
                  </a>
                ))
              )}
            </Panel>
          )}

          {tab === 'Activity' && (
            <Panel title="Activity" note="Audit trail for this employee">
              {!activity || activity.items.length === 0 ? (
                <p className="py-2 text-[12px] text-text-dim">No recorded activity yet.</p>
              ) : (
                activity.items.map((a) => (
                  <div key={a.id} className="border-b border-border/60 py-2 text-[12px] last:border-0">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold">{a.action}</span>
                      <span className="font-mono tabular-nums text-text-faint">
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-text-dim">{a.actorEmail}</div>
                  </div>
                ))
              )}
            </Panel>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-border p-4">
          <Link
            to={`/employees/${employee.id}`}
            className="flex-1 rounded-2xl bg-accent py-3 text-center text-[13px] font-bold text-white"
          >
            View full profile
          </Link>
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-card-subtle py-3 text-center text-[13px] font-bold text-text-dim">
            Close
          </button>
        </div>
      </div>
      <style>{`
        @keyframes wp-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wp-fade-scale { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>,
    document.body,
  );
}
