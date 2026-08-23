import { useMutation, useQueryClient } from '@tanstack/react-query';
import { releasePayslip } from '@/features/payroll/api/payrollApi';

export function useReleasePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releasePayslip(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslips'] }),
  });
}
