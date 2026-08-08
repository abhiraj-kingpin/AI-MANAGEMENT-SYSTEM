import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Reveal } from '@/shared/ui/Reveal';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useReviewCorrection } from '@/features/attendance/hooks/useAttendanceMutations';
import { CorrectionModal } from '@/features/attendance/components/CorrectionModal';
import { useAuthStore } from '@/stores/authStore';
import type { Attendance, AttendanceStatus, ListAttendanceQuery } from '@/types/api';

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'warning' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  half_day: 'warning',
  absent: 'neutral',
  on_leave: 'neutral',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
  on_leave: 'On Leave',
};

function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

const PAGE_SIZE = 20;

export function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCorrect = role === 'super_admin' || role === 'hr';
  const canReview = role === 'super_admin' || role === 'hr' || role === 'manager';

  const [query, setQuery] = useState<ListAttendanceQuery>({
    page: 1,
    limit: PAGE_SIZE,
    from: firstOfMonth(),
    to: today(),
  });
  const [correctingRecord, setCorrectingRecord] = useState<Attendance | null>(null);

  const { data: departments } = useDepartments();
  const { data, isLoading, isError } = useAttendance(query);
  const reviewMutation = useReviewCorrection();

  const handleReview = (id: string, decision: 'approve' | 'reject') => {
    const comment = window.prompt(
      decision === 'approve' ? 'Approval comment (optional):' : 'Reason for rejecting (optional):',
    );
    if (comment === null) return; // user cancelled the prompt
    reviewMutation.mutate({ id, decision, comment: comment || undefined });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Reports
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Attendance</h1>
      </Reveal>

      <Reveal index={1}>
        <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
          <input
            type="date"
            value={query.from}
            onChange={(e) => setQuery((q) => ({ ...q, from: e.target.value, page: 1 }))}
            className="rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
          />
          <span className="text-text-dim">→</span>
          <input
            type="date"
            value={query.to}
            onChange={(e) => setQuery((q) => ({ ...q, to: e.target.value, page: 1 }))}
            className="rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
          />
          <Select
            value={query.departmentId ?? ''}
            onChange={(e) =>
              setQuery((q) => ({ ...q, departmentId: e.target.value || undefined, page: 1 }))
            }
            className="w-auto min-w-[160px]"
          >
            <option value="">All departments</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
          <Select
            value={query.status ?? ''}
            onChange={(e) =>
              setQuery((q) => ({
                ...q,
                status: (e.target.value || undefined) as AttendanceStatus | undefined,
                page: 1,
              }))
            }
            className="w-auto min-w-[150px]"
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load attendance records. Try refreshing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Employee</th>
                    <th className="px-5 py-3.5 font-bold">Date</th>
                    <th className="px-5 py-3.5 font-bold">Check In</th>
                    <th className="px-5 py-3.5 font-bold">Check Out</th>
                    <th className="px-5 py-3.5 font-bold">Hours</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-text-dim">
                        No attendance records match these filters.
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5">
                          {record.employee ? (
                            <>
                              <div className="font-semibold text-text">
                                {record.employee.firstName} {record.employee.lastName}
                              </div>
                              <div className="font-mono text-[12px] text-text-dim">
                                {record.employee.employeeCode}
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {formatTime(record.checkInAt)}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {formatTime(record.checkOutAt)}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {formatHours(record.workingMinutes)}
                          {record.isOvertime && (
                            <span className="ml-1.5 text-[11px] text-warning">
                              +{formatHours(record.overtimeMinutes)} OT
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <Chip tone={STATUS_TONE[record.status]}>
                              {STATUS_LABEL[record.status]}
                            </Chip>
                            {record.correctionRequest?.status === 'pending' && (
                              <span className="rounded-pill bg-warning/10 px-2 py-0.5 text-[10.5px] font-bold text-warning uppercase">
                                Correction pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            {canCorrect && (
                              <button
                                type="button"
                                onClick={() => setCorrectingRecord(record)}
                                className="text-[12.5px] font-semibold text-accent-light hover:underline"
                              >
                                Correct
                              </button>
                            )}
                            {canReview && record.correctionRequest?.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleReview(record.id, 'approve')}
                                  className="text-[12.5px] font-semibold text-success hover:underline"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReview(record.id, 'reject')}
                                  className="text-[12.5px] font-semibold text-danger hover:underline"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
              <span>
                Page {data.page} of {data.pages} — {data.total} record(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page >= data.pages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      {correctingRecord && (
        <CorrectionModal attendance={correctingRecord} onClose={() => setCorrectingRecord(null)} />
      )}
    </div>
  );
}
