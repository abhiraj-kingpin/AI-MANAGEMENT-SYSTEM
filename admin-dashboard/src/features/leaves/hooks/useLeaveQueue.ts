import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchLeaves } from '@/features/leaves/api/leavesApi';
import type { ListLeavesQuery } from '@/types/api';

/** `GET /leaves` is Super Admin/HR/Manager only server-side. Unlike `useAttendance` (whole page is role-gated), Leave's review queue is only *one section* of a page every role can reach — `enabled` lets the caller skip the request entirely for an `employee`, rather than firing it and discarding a 403. */
export function useLeaveQueue(query: ListLeavesQuery, enabled = true) {
  return useQuery({
    queryKey: ['leaves', 'queue', query],
    queryFn: () => fetchLeaves(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
