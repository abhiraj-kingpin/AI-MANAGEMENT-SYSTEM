import { useMutation, useQueryClient } from '@tanstack/react-query';
import { releasePayslip } from '@/features/payroll/api/payrollApi';

export function useReleasePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releasePayslip(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslips'] }),
  });
}

// No bulk-release endpoint on the backend — releases each id individually
// and reports how many actually went through, since one payslip failing
// (e.g. already released by someone else) shouldn't silently swallow the
// rest.
export function useReleaseAllPayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => releasePayslip(id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslips'] }),
  });
}
