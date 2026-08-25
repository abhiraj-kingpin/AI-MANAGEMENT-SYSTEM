import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFaceData, fetchFaceEnrollments, fetchFaceStats } from '@/features/face/api/faceApi';

export function useFaceEnrollments(enabled = true) {
  return useQuery({
    queryKey: ['face', 'enrollments'],
    queryFn: fetchFaceEnrollments,
    enabled,
  });
}

export function useFaceStats(enabled = true) {
  return useQuery({
    queryKey: ['face', 'stats'],
    queryFn: fetchFaceStats,
    enabled,
  });
}

export function useResetFaceEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => deleteFaceData(employeeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['face'] }),
  });
}
