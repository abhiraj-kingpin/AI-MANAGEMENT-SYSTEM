import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveCorrection,
  correctAttendance,
  rejectCorrection,
} from '@/features/attendance/api/attendanceApi';
import type { CorrectAttendanceInput } from '@/types/api';

export function useCorrectAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CorrectAttendanceInput }) =>
      correctAttendance(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useReviewCorrection() {
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
    }) => (decision === 'approve' ? approveCorrection(id, comment) : rejectCorrection(id, comment)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
