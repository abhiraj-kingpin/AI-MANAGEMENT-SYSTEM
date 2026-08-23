import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDepartment,
  updateDepartment,
} from '@/features/departments/api/departmentsApi';
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/types/api';

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => createDepartment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentInput }) =>
      updateDepartment(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}
