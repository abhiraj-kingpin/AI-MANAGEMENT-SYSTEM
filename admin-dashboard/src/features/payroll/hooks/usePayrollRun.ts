import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchPayrollRunStatus, runPayroll } from '@/features/payroll/api/payrollApi';
import type { RunPayrollInput } from '@/types/api';

export function useRunPayroll() {
  return useMutation({
    mutationFn: (input: RunPayrollInput) => runPayroll(input),
  });
}

/**
 * Polls `GET /payroll/runs/:runId/status` every 2s while the run is still
 * `processing` — the run registry is in-memory on the API process, not a
 * durable queue with a webhook, so polling is the only way to know when a
 * batch finishes (see backend/README.md's note on this).
 */
export function usePayrollRunStatus(runId: string | null) {
  return useQuery({
    queryKey: ['payroll', 'run', runId],
    queryFn: () => fetchPayrollRunStatus(runId as string),
    enabled: runId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
  });
}
