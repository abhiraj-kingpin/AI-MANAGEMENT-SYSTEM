import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { ApplyLeaveModal } from '@/features/leaves/components/ApplyLeaveModal';
import { useLeaveQueue } from '@/features/leaves/hooks/useLeaveQueue';
import { useCancelLeave, useReviewLeave } from '@/features/leaves/hooks/useLeaveMutations';
import { useMyBalance, useMyLeaves } from '@/features/leaves/hooks/useMyLeaves';
import { useAuthStore } from '@/stores/authStore';
import type { Leave, LeaveStatus, ListLeavesQuery } from '@/types/api';

const STATUS_TONE: Record<LeaveStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(startIso: string, endIso: string): string {
  return startIso === endIso || startIso.slice(0, 10) === endIso.slice(0, 10)
    ? formatDate(startIso)
    : `${formatDate(startIso)} – ${formatDate(endIso)}`;
}

/** Mirrors the exact rule `leave.service.ts#cancel` enforces server-side: pending is always cancellable; an already-approved leave only if it hasn't started yet. This is a UI convenience to hide a button that would just 400 — the server re-checks it regardless. */
function canCancel(leave: Leave): boolean {
  return (
    leave.status === 'pending' ||
    (leave.status === 'approved' && new Date(leave.startDate).getTime() > Date.now())
  );
}

export function LeavePage() {
  const role = useAuthStore((s) => s.user?.role);
  const canReview = role === 'super_admin' || role === 'hr' || role === 'manager';

  const [isApplying, setIsApplying] = useState(false);
  const [myStatusFilter, setMyStatusFilter] = useState<LeaveStatus | ''>('');
  const [queueQuery, setQueueQuery] = useState<ListLeavesQuery>({ page: 1, limit: PAGE_SIZE });

  const { data: balances } = useMyBalance();
  const { data: myLeaves, isLoading: myLeavesLoading } = useMyLeaves(myStatusFilter || undefined);
  const {
    data: queue,
    isLoading: queueLoading,
    isError: queueError,
  } = useLeaveQueue(queueQuery, canReview);

  const cancelMutation = useCancelLeave();
  const reviewMutation = useReviewLeave();

  const handleCancel = (leave: Leave) => {
    if (!window.confirm('Cancel this leave request?')) return;
    cancelMutation.mutate(leave.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  const handleReview = (leave: Leave, decision: 'approve' | 'reject') => {
    if (decision === 'reject') {
      const comment = window.prompt('Reason for rejecting (required):');
      if (comment === null) return;
      if (!comment.trim()) {
        window.alert('A reason is required to reject a leave request.');
        return;
      }
      reviewMutation.mutate(
        { id: leave.id, decision, comment: comment.trim() },
        { onError: (err) => window.alert(apiErrorMessage(err)) },
      );
      return;
    }
    const comment = window.prompt('Approval comment (optional):');
    if (comment === null) return;
    reviewMutation.mutate(
      { id: leave.id, decision, comment: comment || undefined },
      { onError: (err) => window.alert(apiErrorMessage(err)) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Time Off
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Leave</h1>
        </div>
        <Button onClick={() => setIsApplying(true)}>Apply for Leave</Button>
      </Reveal>

      <Reveal index={1}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {balances?.map((balance) => (
            <Card key={balance.leaveTypeId} className="px-5 py-4">
              <p className="text-[12.5px] font-bold text-text-dim">{balance.leaveTypeName}</p>
              <p className="mt-1.5 text-2xl font-extrabold">
                {balance.remaining}
                <span className="ml-1 text-[13px] font-semibold text-text-dim">
                  / {balance.allocated + balance.carriedForward} left
                </span>
              </p>
              <p className="mt-1 text-[12px] text-text-dim">
                {balance.used} used
                {balance.carriedForward > 0 ? ` · ${balance.carriedForward} carried forward` : ''}
              </p>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-bold">My Requests</h2>
            <Select
              value={myStatusFilter}
              onChange={(e) => setMyStatusFilter(e.target.value as LeaveStatus | '')}
              className="w-auto min-w-[150px]"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as LeaveStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                  <th className="px-5 py-3.5 font-bold">Leave Type</th>
                  <th className="px-5 py-3.5 font-bold">Dates</th>
                  <th className="px-5 py-3.5 font-bold">Days</th>
                  <th className="px-5 py-3.5 font-bold">Reason</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myLeavesLoading && !myLeaves ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                      Loading…
                    </td>
                  </tr>
                ) : myLeaves && myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  myLeaves?.map((leave) => (
                    <tr
                      key={leave.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5 font-semibold text-text">
                        {leave.leaveTypeName ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-text-dim">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </td>
                      <td className="px-5 py-3.5 text-text-dim">{leave.totalDays}</td>
                      <td
                        className="max-w-[240px] truncate px-5 py-3.5 text-text-dim"
                        title={leave.reason}
                      >
                        {leave.reason}
                      </td>
                      <td className="px-5 py-3.5">
                        <Chip tone={STATUS_TONE[leave.status]}>{STATUS_LABEL[leave.status]}</Chip>
                      </td>
                      <td className="px-5 py-3.5">
                        {canCancel(leave) && (
                          <button
                            type="button"
                            onClick={() => handleCancel(leave)}
                            className="text-[12.5px] font-semibold text-danger hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      {canReview && (
        <Reveal index={3}>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-bold">Review Queue</h2>
              <Select
                value={queueQuery.status ?? ''}
                onChange={(e) =>
                  setQueueQuery((q) => ({
                    ...q,
                    status: (e.target.value || undefined) as LeaveStatus | undefined,
                    page: 1,
                  }))
                }
                className="w-auto min-w-[150px]"
              >
                <option value="">All statuses</option>
                {(Object.keys(STATUS_LABEL) as LeaveStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </div>

            {queueError ? (
              <p className="p-8 text-center text-sm text-danger">
                Couldn't load the review queue. Try refreshing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3.5 font-bold">Employee</th>
                      <th className="px-5 py-3.5 font-bold">Leave Type</th>
                      <th className="px-5 py-3.5 font-bold">Dates</th>
                      <th className="px-5 py-3.5 font-bold">Days</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueLoading && !queue ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                          Loading…
                        </td>
                      </tr>
                    ) : queue && queue.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                          No leave requests match this filter.
                        </td>
                      </tr>
                    ) : (
                      queue?.items.map((leave) => (
                        <tr
                          key={leave.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-3.5">
                            {leave.employee ? (
                              <>
                                <div className="font-semibold text-text">
                                  {leave.employee.firstName} {leave.employee.lastName}
                                </div>
                                <div className="font-mono text-[12px] text-text-dim">
                                  {leave.employee.employeeCode}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {leave.leaveTypeName ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {formatDateRange(leave.startDate, leave.endDate)}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">{leave.totalDays}</td>
                          <td className="px-5 py-3.5">
                            <Chip tone={STATUS_TONE[leave.status]}>
                              {STATUS_LABEL[leave.status]}
                            </Chip>
                          </td>
                          <td className="px-5 py-3.5">
                            {leave.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReview(leave, 'approve')}
                                  className="text-[12.5px] font-semibold text-success hover:underline"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReview(leave, 'reject')}
                                  className="text-[12.5px] font-semibold text-danger hover:underline"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {queue && queue.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
                <span>
                  Page {queue.page} of {queue.pages} — {queue.total} request(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="px-3.5 py-1.5 text-[12.5px]"
                    disabled={queue.page <= 1}
                    onClick={() => setQueueQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3.5 py-1.5 text-[12.5px]"
                    disabled={queue.page >= queue.pages}
                    onClick={() => setQueueQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Reveal>
      )}

      {isApplying && <ApplyLeaveModal onClose={() => setIsApplying(false)} />}
    </div>
  );
}
