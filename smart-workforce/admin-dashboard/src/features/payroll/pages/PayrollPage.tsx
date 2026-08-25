import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { RunPayrollModal } from '@/features/payroll/components/RunPayrollModal';
import { SalaryFormModal } from '@/features/payroll/components/SalaryFormModal';
import { usePayslips } from '@/features/payroll/hooks/usePayslips';
import { useSalaries } from '@/features/payroll/hooks/useSalaries';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { Salary } from '@/types/api';

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function PayrollPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  const [editingSalary, setEditingSalary] = useState<Salary | 'new' | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const {
    data: salaries,
    isLoading: salariesLoading,
    isError: salariesError,
  } = useSalaries({ page: 1, limit: 100 }, canManage);
  // Meta-only (limit 1) — just this month's pending count for the pointer
  // card below; the full table lives on its own page now (Payslips).
  const { data: pendingPayslips } = usePayslips({ month: thisMonth(), status: 'generated', page: 1, limit: 1 }, canManage);

  const searchQuery = useSearchStore((s) => s.query);
  const visibleSalaries = (salaries?.items ?? []).filter((salary) =>
    matchesQuery(searchQuery, salary.employee?.firstName, salary.employee?.lastName, salary.employee?.employeeCode),
  );

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

        <Reveal index={2}>
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <div className="flex-1">
              <h2 className="text-[15px] font-bold">Payslips</h2>
              <p className="mt-0.5 text-[12.5px] font-medium text-text-dim">
                {pendingPayslips ? `${pendingPayslips.total} generated, awaiting release this month` : 'Generate, release, and download individual payslips'}
              </p>
            </div>
            <Link
              to="/payslips"
              className="rounded-xl bg-card-subtle px-4 py-2.5 text-[12.5px] font-bold text-accent-light hover:bg-ink/[0.06]"
            >
              Open Payslips →
            </Link>
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
