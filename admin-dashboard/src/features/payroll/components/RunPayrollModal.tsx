import { type FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { usePayrollRunStatus, useRunPayroll } from '@/features/payroll/hooks/usePayrollRun';

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * `POST /payroll/run` → `{runId}`, then polls `GET /payroll/runs/:runId/status`
 * every 2s until it leaves `processing` — see `usePayrollRunStatus`. One
 * generatePayslipForEmployee failure doesn't stop the batch; failures are
 * reported per-employee once the run completes.
 */
export function RunPayrollModal({ onClose }: { onClose: () => void }) {
  const { data: departments } = useDepartments();
  const [month, setMonth] = useState(thisMonth());
  const [departmentId, setDepartmentId] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMutation = useRunPayroll();
  const { data: run } = usePayrollRunStatus(runId);
  const queryClient = useQueryClient();

  // A completed/failed run means new/updated payslips now exist — refresh
  // the Payslips list once, the moment this run actually finishes, instead
  // of leaving it stale until the next unrelated refetch.
  useEffect(() => {
    if (run?.status === 'completed' || run?.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    }
  }, [run?.status, queryClient]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startMutation.mutate(
      { month, departmentId: departmentId || undefined },
      {
        onSuccess: (result) => setRunId(result.runId),
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Run Payroll" onClose={onClose}>
      {!runId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Month" htmlFor="runMonth">
            <Input
              id="runMonth"
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Field>
          <Field label="Department (optional)" htmlFor="runDepartment">
            <Select
              id="runDepartment"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All departments</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </Field>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" isLoading={startMutation.isPending}>
              Start Run
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 text-sm text-text-dim hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-dim">
            {run?.status === 'processing'
              ? `Processing ${run.processed} / ${run.totalEmployees}…`
              : run?.status === 'completed'
                ? 'Run completed.'
                : run?.status === 'failed'
                  ? 'Run crashed unexpectedly.'
                  : 'Starting…'}
          </p>

          {run && run.status !== 'processing' && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-white/[0.03] px-3 py-2.5">
                <p className="text-lg font-extrabold text-success">{run.created}</p>
                <p className="text-[11px] text-text-dim uppercase">Created</p>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.03] px-3 py-2.5">
                <p className="text-lg font-extrabold text-accent-light">{run.updated}</p>
                <p className="text-[11px] text-text-dim uppercase">Updated</p>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.03] px-3 py-2.5">
                <p className="text-lg font-extrabold text-text-dim">{run.skipped}</p>
                <p className="text-[11px] text-text-dim uppercase">Skipped</p>
              </div>
            </div>
          )}

          {run && run.failed.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-xl border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">
              {run.failed.map((f) => (
                <p key={f.employeeId}>
                  {f.employeeId}: {f.message}
                </p>
              ))}
            </div>
          )}

          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}
