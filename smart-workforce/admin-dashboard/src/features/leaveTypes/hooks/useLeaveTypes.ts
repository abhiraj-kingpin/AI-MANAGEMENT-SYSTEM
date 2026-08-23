import { useQuery } from '@tanstack/react-query';
import { fetchLeaveTypes } from '@/features/leaveTypes/api/leaveTypesApi';

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leaveTypes'],
    queryFn: fetchLeaveTypes,
  });
}
