import { Card } from '@/shared/ui/Card';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useReviewCorrection } from '@/features/attendance/hooks/useAttendanceMutations';
import { pushToast } from '@/stores/toastStore';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Above the attendance log — every record with an open correction request,
 *  regardless of the log's own date-range filter, so nothing pending falls
 *  out of view just because it's outside the currently selected window. */
export function CorrectionsQueue({ onAddMissing }: { onAddMissing: () => void }) {
  const { data, isLoading } = useAttendance({ hasPendingCorrection: true, limit: 50 });
  const reviewMutation = useReviewCorrection();

  const handleReview = (id: string, name: string, decision: 'approve' | 'reject') => {
    reviewMutation.mutate(
      { id, decision },
      { onSuccess: () => pushToast(`${name}'s correction ${decision === 'approve' ? 'approved' : 'rejected'}`) },
    );
  };

  const pending = data?.items ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">Correction requests</h2>
          <p className="mt-0.5 text-[11.5px] font-medium text-text-dim">
            Missing or disputed punches raised by employees and managers
          </p>
        </div>
        <button
          type="button"
          onClick={onAddMissing}
          className="flex items-center gap-1.5 rounded-xl bg-card-subtle px-3.5 py-2 text-[12px] font-bold text-text-dim hover:bg-ink/[0.06]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add missing attendance
        </button>
      </div>

      {isLoading && !data ? (
        <p className="p-8 text-center text-sm text-text-dim">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="p-6 text-center text-[12.5px] text-text-dim">No pending correction requests.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {pending.map((record) => (
            <div key={record.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-[160px] flex-1">
                <div className="font-semibold text-text">
                  {record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : '—'}
                </div>
                <div className="mt-0.5 text-[11.5px] text-text-dim">{record.correctionRequest?.reason}</div>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-text-faint">{formatDate(record.date)}</div>
              <div className="flex items-center gap-2 font-mono text-[12px] tabular-nums">
                <span className="text-text-faint line-through">
                  {formatTime(record.checkInAt)}–{formatTime(record.checkOutAt)}
                </span>
                <span aria-hidden="true" className="text-text-faint">
                  →
                </span>
                <span className="font-semibold text-text">
                  {formatTime(record.correctionRequest?.requestedCheckInAt ?? null)}–
                  {formatTime(record.correctionRequest?.requestedCheckOutAt ?? null)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleReview(
                      record.id,
                      record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Record',
                      'approve',
                    )
                  }
                  className="rounded-lg bg-success/10 px-2.5 py-1.5 text-[11.5px] font-bold text-success"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleReview(
                      record.id,
                      record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Record',
                      'reject',
                    )
                  }
                  className="rounded-lg bg-card-subtle px-2.5 py-1.5 text-[11.5px] font-bold text-text-dim"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
