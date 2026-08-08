import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSalary, updateSalary } from '@/features/payroll/api/payrollApi';
import type { CreateSalaryInput, UpdateSalaryInput } from '@/types/api';

export function useCreateSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalaryInput) => createSalary(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salaries'] }),
  });
}

export function useUpdateSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: string; input: UpdateSalaryInput }) =>
      updateSalary(employeeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salaries'] }),
  });
}
