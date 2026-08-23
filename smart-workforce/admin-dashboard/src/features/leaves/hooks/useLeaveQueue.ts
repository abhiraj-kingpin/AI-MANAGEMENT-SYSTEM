import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchLeaves } from '@/features/leaves/api/leavesApi';
import type { ListLeavesQuery } from '@/types/api';

export function useLeaveQueue(query: ListLeavesQuery, enabled = true) {
  return useQuery({
    queryKey: ['leaves', 'queue', query],
    queryFn: () => fetchLeaves(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
