import { useQuery } from '@tanstack/react-query';
import { fetchLeaves } from '@/features/leaves/api/leavesApi';

// Powers both the summary stat cards and the calendar view — a single wide
// fetch (the API's own max page size) rather than one call per stat. Real
// backend data, not a dedicated aggregation endpoint: fine at this org's
// scale, but a leave count past this page size would need a proper
// server-side aggregation to stay accurate.
export function useLeaveOverview(enabled: boolean) {
  return useQuery({
    queryKey: ['leaves', 'overview'],
    queryFn: () => fetchLeaves({ page: 1, limit: 100 }),
    enabled,
  });
}
