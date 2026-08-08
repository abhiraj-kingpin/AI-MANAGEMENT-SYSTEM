import { useQuery } from '@tanstack/react-query';
import { fetchLeaveTypes } from '@/features/leaveTypes/api/leaveTypesApi';

/** `GET /leave-types` is open to any authenticated user — an employee needs to know what leave types exist to apply for one, same reasoning as `useDepartments`. */
export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leaveTypes'],
    queryFn: fetchLeaveTypes,
  });
}
