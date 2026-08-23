import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchPayrollRunStatus, runPayroll } from '@/features/payroll/api/payrollApi';
import type { RunPayrollInput } from '@/types/api';

export function useRunPayroll() {
  return useMutation({
    mutationFn: (input: RunPayrollInput) => runPayroll(input),
  });
}

export function usePayrollRunStatus(runId: string | null) {
  return useQuery({
    queryKey: ['payroll', 'run', runId],
    queryFn: () => fetchPayrollRunStatus(runId as string),
    enabled: runId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
  });
}
