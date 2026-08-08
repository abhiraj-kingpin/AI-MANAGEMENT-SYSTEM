import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assignShift,
  createShift,
  deactivateShift,
  updateShift,
} from '@/features/shifts/api/shiftsApi';
import type { AssignShiftInput, CreateShiftInput, UpdateShiftInput } from '@/types/api';

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShiftInput) => createShift(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShiftInput }) => updateShift(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeactivateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateShift(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignShiftInput) => assignShift(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}
