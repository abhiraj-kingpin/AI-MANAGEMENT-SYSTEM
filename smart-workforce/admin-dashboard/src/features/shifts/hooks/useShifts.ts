import { useQuery } from '@tanstack/react-query';
import { fetchMyShift, fetchShifts } from '@/features/shifts/api/shiftsApi';

export function useShifts(includeInactive: boolean, enabled = true) {
  return useQuery({
    queryKey: ['shifts', 'list', includeInactive],
    queryFn: () => fetchShifts(includeInactive),
    enabled,
  });
}

export function useMyShift() {
  return useQuery({
    queryKey: ['shifts', 'me'],
    queryFn: fetchMyShift,
  });
}
