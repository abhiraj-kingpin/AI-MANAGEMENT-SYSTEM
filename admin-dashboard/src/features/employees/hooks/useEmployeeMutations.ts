import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from '@/features/employees/api/employeesApi';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/types/api';

/** Every mutation below invalidates the list + count queries so a create/edit/delete is reflected immediately, not just on next navigation. */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => updateEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
