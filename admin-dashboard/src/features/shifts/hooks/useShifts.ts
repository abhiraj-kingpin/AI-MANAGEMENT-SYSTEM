import { useQuery } from '@tanstack/react-query';
import { fetchMyShift, fetchShifts } from '@/features/shifts/api/shiftsApi';

/** `GET /shifts` is Super Admin/HR only server-side — only called from the role-gated management section of ShiftsPage (see ShiftsPage's `canManage`). */
export function useShifts(includeInactive: boolean, enabled = true) {
  return useQuery({
    queryKey: ['shifts', 'list', includeInactive],
    queryFn: () => fetchShifts(includeInactive),
    enabled,
  });
}

/** `GET /shifts/me` — always the caller's own current assignment, open to every role. */
export function useMyShift() {
  return useQuery({
    queryKey: ['shifts', 'me'],
    queryFn: fetchMyShift,
  });
}
