import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '@/features/audit/api/auditApi';
import type { ListAuditLogsQuery } from '@/types/api';

export function useAuditLogs(query: ListAuditLogsQuery) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => fetchAuditLogs(query),
    placeholderData: keepPreviousData,
  });
}
