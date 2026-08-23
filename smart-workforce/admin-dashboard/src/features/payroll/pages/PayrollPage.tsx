import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { downloadPayslipPdf } from '@/features/payroll/api/payrollApi';
import { RunPayrollModal } from '@/features/payroll/components/RunPayrollModal';
import { SalaryFormModal } from '@/features/payroll/components/SalaryFormModal';
import { useReleasePayslip } from '@/features/payroll/hooks/usePayslipMutations';
import { usePayslips } from '@/features/payroll/hooks/usePayslips';
import { useSalaries } from '@/features/payroll/hooks/useSalaries';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { ListPayslipsQuery, Payslip, PayslipStatus, Salary } from '@/types/api';

const PAYSLIP_STATUS_TONE: Record<PayslipStatus, 'success' | 'warning' | 'neutral'> = {
  draft: 'neutral',
  generated: 'warning',
  released: 'success',
};

const PAYSLIP_STATUS_LABEL: Record<PayslipStatus, string> = {
  draft: 'Draft',
  generated: 'Generated',
  released: 'Released',
};

const PAGE_SIZE = 20;

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleDownload(payslip: Payslip) {
  try {
    await downloadPayslipPdf(payslip.id, payslip.month);
  } catch (err) {
    window.alert(apiErrorMessage(err, 'Could not download this payslip.'));
  }
}

export function PayrollPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  const [editingSalary, setEditingSalary] = useState<Salary | 'new' | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [payslipQuery, setPayslipQuery] = useState<ListPayslipsQuery>({
    page: 1,
    limit: PAGE_SIZE,
  });

  const {
    data: salaries,
    isLoading: salariesLoading,
    isError: salariesError,
  } = useSalaries({ page: 1, limit: 100 }, canManage);
  const {
    data: payslips,
    isLoading: payslipsLoading,
    isError: payslipsError,
  } = usePayslips(payslipQuery, canManage);
  const releaseMutation = useReleasePayslip();

  const searchQuery = useSearchStore((s) => s.query);
  const visibleSalaries = (salaries?.items ?? []).filter((salary) =>
    matchesQuery(searchQuery, salary.employee?.firstName, salary.employee?.lastName, salary.employee?.employeeCode),
  );
  const visiblePayslips = (payslips?.items ?? []).filter((p) =>
    matchesQuery(
      searchQuery,
      p.employee?.firstName,
      p.employee?.lastName,
      p.employee?.employeeCode,
      p.month,
    ),
  );

  const handleRelease = (payslip: Payslip) => {
    if (!window.confirm(`Release the ${payslip.month} payslip? This notifies the employee.`))
      return;
    releaseMutation.mutate(payslip.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Compensation
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Payroll</h1>
        </Reveal>
        <Reveal index={1}>
          <Card className="flex flex-col items-center gap-2 p-14 text-center">
            <p className="text-sm text-text-dim">
              This console is for running payroll and managing everyone's pay — check your own
              payslips from the mobile app instead.
            </p>
          </Card>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Compensation
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Payroll</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setIsRunning(true)}>
            Run Payroll
          </Button>
          <Button onClick={() => setEditingSalary('new')}>New Salary</Button>
        </div>
      </Reveal>

      <Reveal index={1}>
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-bold">Salaries</h2>
          </div>
            {salariesError ? (
              <p className="p-8 text-center text-sm text-danger">
                Couldn't load salaries. Try refreshing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3.5 font-bold">Employee</th>
                      <th className="px-5 py-3.5 font-bold">Base Salary</th>
                      <th className="px-5 py-3.5 font-bold">Effective From</th>
                      <th className="px-5 py-3.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesLoading && !salaries ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-text-dim">
                          Loading…
                        </td>
                      </tr>
                    ) : visibleSalaries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-text-dim">
                          {searchQuery
                            ? `No salary records match "${searchQuery}".`
                            : 'No salary records yet.'}
                        </td>
                      </tr>
                    ) : (
                      visibleSalaries.map((salary) => (
                        <tr
                          key={salary.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                        >
                          <td className="px-5 py-3.5">
                            {salary.employee ? (
                              <>
                                <div className="font-semibold text-text">
                                  {salary.employee.firstName} {salary.employee.lastName}
                                </div>
                                <div className="font-mono text-[12px] text-text-dim">
                                  {salary.employee.employeeCode}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {formatMoney(salary.baseSalary, salary.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {new Date(salary.effectiveFrom).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => setEditingSalary(salary)}
                              className="text-[12.5px] font-semibold text-accent-light hover:underline"
                            >
                              Edit
                            </button>
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

        <Reveal index={3}>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-bold">Payslips</h2>
              <div className="flex flex-wrap gap-3">
                <input
                  type="month"
                  value={payslipQuery.month ?? ''}
                  onChange={(e) =>
                    setPayslipQuery((q) => ({ ...q, month: e.target.value || undefined, page: 1 }))
                  }
                  className="rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
                />
                <Select
                  value={payslipQuery.status ?? ''}
                  onChange={(e) =>
                    setPayslipQuery((q) => ({
                      ...q,
                      status: (e.target.value || undefined) as PayslipStatus | undefined,
                      page: 1,
                    }))
                  }
                  className="w-auto min-w-[150px]"
                >
                  <option value="">All statuses</option>
                  {(Object.keys(PAYSLIP_STATUS_LABEL) as PayslipStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {PAYSLIP_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {payslipsError ? (
              <p className="p-8 text-center text-sm text-danger">
                Couldn't load payslips. Try refreshing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3.5 font-bold">Employee</th>
                      <th className="px-5 py-3.5 font-bold">Month</th>
                      <th className="px-5 py-3.5 font-bold">Net Pay</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslipsLoading && !payslips ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                          Loading…
                        </td>
                      </tr>
                    ) : visiblePayslips.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                          {searchQuery
                            ? `No payslips on this page match "${searchQuery}".`
                            : 'No payslips match this filter.'}
                        </td>
                      </tr>
                    ) : (
                      visiblePayslips.map((payslip) => (
                        <tr
                          key={payslip.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                        >
                          <td className="px-5 py-3.5">
                            {payslip.employee ? (
                              <>
                                <div className="font-semibold text-text">
                                  {payslip.employee.firstName} {payslip.employee.lastName}
                                </div>
                                <div className="font-mono text-[12px] text-text-dim">
                                  {payslip.employee.employeeCode}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">{payslip.month}</td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {formatAmount(payslip.netPay)}
                          </td>
                          <td className="px-5 py-3.5">
                            <Chip tone={PAYSLIP_STATUS_TONE[payslip.status]}>
                              {PAYSLIP_STATUS_LABEL[payslip.status]}
                            </Chip>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-2">
                              {payslip.status === 'generated' && (
                                <button
                                  type="button"
                                  onClick={() => handleRelease(payslip)}
                                  className="text-[12.5px] font-semibold text-success hover:underline"
                                >
                                  Release
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDownload(payslip)}
                                className="text-[12.5px] font-semibold text-accent-light hover:underline"
                              >
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {searchQuery && payslips && payslips.pages > 1 && (
              <p className="border-t border-border px-5 py-3.5 text-[12px] text-text-faint">
                Search only matches payslips already loaded on this page — clear it to page
                through the rest.
              </p>
            )}
            {!searchQuery && payslips && payslips.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
                <span>
                  Page {payslips.page} of {payslips.pages} — {payslips.total} payslip(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="px-3.5 py-1.5 text-[12.5px]"
                    disabled={payslips.page <= 1}
                    onClick={() => setPayslipQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3.5 py-1.5 text-[12.5px]"
                    disabled={payslips.page >= payslips.pages}
                    onClick={() => setPayslipQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Reveal>

      {editingSalary && (
        <SalaryFormModal
          salary={editingSalary === 'new' ? undefined : editingSalary}
          onClose={() => setEditingSalary(null)}
        />
      )}
      {isRunning && <RunPayrollModal onClose={() => setIsRunning(false)} />}
    </div>
  );
}
