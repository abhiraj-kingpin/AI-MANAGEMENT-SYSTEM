import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  applyLeave,
  approveLeave,
  cancelLeave,
  rejectLeave,
} from '@/features/leaves/api/leavesApi';
import type { ApplyLeaveInput } from '@/types/api';

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyLeaveInput) => applyLeave(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useReviewLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: 'approve' | 'reject';
      comment?: string;
    }) => (decision === 'approve' ? approveLeave(id, comment) : rejectLeave(id, comment ?? '')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
