import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { Select } from '@/shared/ui/Field';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { downloadPayslipPdf } from '@/features/payroll/api/payrollApi';
import { RunPayrollModal } from '@/features/payroll/components/RunPayrollModal';
import { useReleaseAllPayslips, useReleasePayslip } from '@/features/payroll/hooks/usePayslipMutations';
import { usePayslips } from '@/features/payroll/hooks/usePayslips';
import { useHeadcount } from '@/features/employees/hooks/useHeadcount';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import { pushToast } from '@/stores/toastStore';
import type { ListPayslipsQuery, Payslip, PayslipStatus } from '@/types/api';

const STATUS_TONE: Record<PayslipStatus, 'success' | 'warning' | 'neutral'> = {
  draft: 'neutral',
  generated: 'warning',
  released: 'success',
};

const STATUS_LABEL: Record<PayslipStatus, string> = {
  draft: 'Draft',
  generated: 'Generated',
  released: 'Released',
};

const PAGE_SIZE = 20;

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayslipsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  const [month, setMonth] = useState(thisMonth());
  const [query, setQuery] = useState<ListPayslipsQuery>({ page: 1, limit: PAGE_SIZE, month: thisMonth() });
  const [isRunning, setIsRunning] = useState(false);

  const { data: headcount } = useHeadcount();
  const { data: payslips, isLoading, isError } = usePayslips(query, canManage);
  // Meta-only lookups (limit 1) for the header counts, so they reflect the
  // whole month rather than just whatever page is on screen.
  const { data: generatedTotal } = usePayslips({ month, status: 'generated', page: 1, limit: 1 }, canManage);
  const { data: releasedTotal } = usePayslips({ month, status: 'released', page: 1, limit: 1 }, canManage);

  const releaseMutation = useReleasePayslip();
  const releaseAllMutation = useReleaseAllPayslips();

  const searchQuery = useSearchStore((s) => s.query);
  const visiblePayslips = (payslips?.items ?? []).filter((p) =>
    matchesQuery(searchQuery, p.employee?.firstName, p.employee?.lastName, p.employee?.employeeCode, p.month),
  );

  const handleDownload = async (payslip: Payslip) => {
    try {
      await downloadPayslipPdf(payslip.id, payslip.month);
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Could not download this payslip.'));
    }
  };

  const handleRelease = (payslip: Payslip) => {
    releaseMutation.mutate(payslip.id, {
      onSuccess: () => pushToast(`${payslip.month} payslip released`),
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  const handleReleaseAll = () => {
    const generatedIds = (payslips?.items ?? []).filter((p) => p.status === 'generated').map((p) => p.id);
    if (generatedIds.length === 0) return;
    if (!window.confirm(`Release ${generatedIds.length} payslip(s) for ${month}? This notifies each employee.`)) return;
    releaseAllMutation.mutate(generatedIds, {
      onSuccess: (result) => pushToast(`Released ${result.succeeded} payslip(s)${result.failed ? `, ${result.failed} failed` : ''}`),
    });
  };

  const generatedCount = (generatedTotal?.total ?? 0) + (releasedTotal?.total ?? 0);
  const releasedCount = releasedTotal?.total ?? 0;

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Compensation
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Payslips</h1>
        </Reveal>
        <Reveal index={1}>
          <Card className="p-14 text-center text-sm text-text-dim">
            Check your own payslips from the mobile app instead.
          </Card>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Compensation
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Payslips</h1>
      </Reveal>

      <Reveal index={1}>
        <div className="flex flex-wrap items-center gap-4 rounded-card bg-ink px-5 py-4">
          <div className="flex-1">
            <p className="font-mono text-[12px] tabular-nums text-white/50">
              {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-0.5 font-mono text-[13.5px] font-bold tabular-nums text-white">
              {generatedCount} of {headcount ?? '—'} generated · {releasedCount} released to employees
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setQuery((q) => ({ ...q, month: e.target.value, page: 1 }));
            }}
            className="rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[13px] text-white [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={() => setIsRunning(true)}
            className="rounded-xl bg-white/[0.12] px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-white/[0.18]"
          >
            Generate remaining
          </button>
          <Button onClick={handleReleaseAll} isLoading={releaseAllMutation.isPending}>
            Release all
          </Button>
        </div>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-bold">All payslips</h2>
            <Select
              value={query.status ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, status: (e.target.value || undefined) as PayslipStatus | undefined, page: 1 }))}
              className="w-auto min-w-[150px]"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as PayslipStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </div>

          {isError ? (
            <p className="p-8 text-center text-sm text-danger">Couldn't load payslips. Try refreshing.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Employee</th>
                    <th className="px-5 py-3.5 font-bold">Period</th>
                    <th className="px-5 py-3.5 font-bold">Gross</th>
                    <th className="px-5 py-3.5 font-bold">Net</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !payslips ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : visiblePayslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        No payslips for {month} yet.
                      </td>
                    </tr>
                  ) : (
                    visiblePayslips.map((payslip) => (
                      <tr key={payslip.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]">
                        <td className="px-5 py-3.5">
                          {payslip.employee ? (
                            <>
                              <div className="font-semibold text-text">
                                {payslip.employee.firstName} {payslip.employee.lastName}
                              </div>
                              <div className="font-mono text-[12px] tabular-nums text-text-dim">{payslip.employee.employeeCode}</div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[12px] tabular-nums text-text-dim">{payslip.month}</td>
                        <td className="px-5 py-3.5 font-mono text-[12.5px] tabular-nums text-text-dim">
                          {formatAmount(payslip.grossPay)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[12.5px] tabular-nums font-medium">
                          {formatAmount(payslip.netPay)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Chip tone={STATUS_TONE[payslip.status]}>{STATUS_LABEL[payslip.status]}</Chip>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleDownload(payslip)}
                              className="rounded-lg bg-card-subtle px-2.5 py-1.5 text-[11.5px] font-bold text-text-dim hover:bg-ink/[0.06]"
                            >
                              PDF
                            </button>
                            {payslip.status === 'generated' && (
                              <button
                                type="button"
                                onClick={() => handleRelease(payslip)}
                                className="rounded-lg bg-success/10 px-2.5 py-1.5 text-[11.5px] font-bold text-success"
                              >
                                Release
                              </button>
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

          {payslips && payslips.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
              <span>
                Page {payslips.page} of {payslips.pages} — {payslips.total} payslip(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={payslips.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={payslips.page >= payslips.pages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      {isRunning && <RunPayrollModal onClose={() => setIsRunning(false)} />}
    </div>
  );
}
