import { useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Popover } from '@/shared/ui/Popover';
import { Reveal } from '@/shared/ui/Reveal';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useReviewCorrection } from '@/features/attendance/hooks/useAttendanceMutations';
import { CorrectionModal } from '@/features/attendance/components/CorrectionModal';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { Attendance, AttendanceMethod, AttendanceStatus, ListAttendanceQuery } from '@/types/api';

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

const METHOD_LABEL: Record<AttendanceMethod, string> = {
  gps: 'GPS',
  qr: 'QR',
  face: 'Face',
  manual: 'Manual',
};

const METHOD_TONE: Record<AttendanceMethod, string> = {
  gps: 'bg-accent/10 text-accent',
  qr: 'bg-success/10 text-success',
  face: 'bg-warning/10 text-warning',
  manual: 'bg-text-dim/10 text-text-dim',
};

/** No raw check-in photo is ever stored server-side (only a face-match
 *  confidence score against the employee's enrolled template) — this shows
 *  everything that IS captured: method, GPS coordinates + accuracy for
 *  in/out, and the match confidence for a face check-in. That's the
 *  evidence available to confirm a punch wasn't phoned in from elsewhere. */
function VerificationCell({ record }: { record: Attendance }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasLocation = !!(record.checkInLocation || record.checkOutLocation);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!hasLocation && record.faceMatchConfidence === null}
        className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold disabled:cursor-default disabled:opacity-60 ${METHOD_TONE[record.method]}`}
      >
        {METHOD_LABEL[record.method]}
        {hasLocation && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.4" />
          </svg>
        )}
      </button>
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="w-64 rounded-xl border border-border bg-white p-3.5 shadow-[0_16px_40px_-12px_rgba(20,20,50,0.25)]"
      >
        <div className="flex flex-col gap-2.5 text-[12.5px]">
          {record.faceMatchConfidence !== null && (
            <div className="flex justify-between">
              <span className="text-text-dim">Face match confidence</span>
              <span className="font-mono font-semibold">
                {(record.faceMatchConfidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {record.checkInLocation ? (
            <div className="flex justify-between gap-2">
              <span className="text-text-dim">Check-in location</span>
              <span className="font-mono">
                {record.checkInLocation.lat.toFixed(4)}, {record.checkInLocation.lng.toFixed(4)}
                {record.checkInLocation.accuracyMeters != null && (
                  <span className="text-text-faint"> (±{Math.round(record.checkInLocation.accuracyMeters)}m)</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-text-dim">Check-in location</span>
              <span className="text-text-faint">Not captured</span>
            </div>
          )}
          {record.checkOutLocation && (
            <div className="flex justify-between gap-2">
              <span className="text-text-dim">Check-out location</span>
              <span className="font-mono">
                {record.checkOutLocation.lat.toFixed(4)}, {record.checkOutLocation.lng.toFixed(4)}
                {record.checkOutLocation.accuracyMeters != null && (
                  <span className="text-text-faint"> (±{Math.round(record.checkOutLocation.accuracyMeters)}m)</span>
                )}
              </span>
            </div>
          )}
          {record.checkInLocation && (
            <a
              href={`https://www.google.com/maps?q=${record.checkInLocation.lat},${record.checkInLocation.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 text-center text-[12px] font-semibold text-accent-light hover:underline"
            >
              Open in Maps ↗
            </a>
          )}
        </div>
      </Popover>
    </div>
  );
}

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

  // Filters the page of records already loaded — see searchStore.ts.
  const searchQuery = useSearchStore((s) => s.query);
  const visibleItems = (data?.items ?? []).filter((record) =>
    matchesQuery(searchQuery, record.employee?.firstName, record.employee?.lastName, record.employee?.employeeCode),
  );

  const handleReview = (id: string, decision: 'approve' | 'reject') => {
    const comment = window.prompt(
      decision === 'approve' ? 'Approval comment (optional):' : 'Reason for rejecting (optional):',
    );
    if (comment === null) return;
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
            className="rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
          />
          <span className="text-text-dim">→</span>
          <input
            type="date"
            value={query.to}
            onChange={(e) => setQuery((q) => ({ ...q, to: e.target.value, page: 1 }))}
            className="rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
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
                    <th className="px-5 py-3.5 font-bold">Verification</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-text-dim">
                        {searchQuery
                          ? `No attendance records on this page match "${searchQuery}".`
                          : 'No attendance records match these filters.'}
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((record) => (
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
                          <VerificationCell record={record} />
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

          {searchQuery && data && data.pages > 1 && (
            <p className="border-t border-border px-5 py-3.5 text-[12px] text-text-faint">
              Search only matches records already loaded on this page — clear it to page through
              the rest.
            </p>
          )}
          {!searchQuery && data && data.pages > 1 && (
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
