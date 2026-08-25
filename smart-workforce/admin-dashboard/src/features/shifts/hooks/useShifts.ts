import { useQuery } from '@tanstack/react-query';
import { fetchMyShift, fetchRoster, fetchShifts } from '@/features/shifts/api/shiftsApi';
import type { ListRosterQuery } from '@/types/api';

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

export function useRoster(query: ListRosterQuery, enabled = true) {
  return useQuery({
    queryKey: ['shifts', 'roster', query],
    queryFn: () => fetchRoster(query),
    enabled,
  });
}
