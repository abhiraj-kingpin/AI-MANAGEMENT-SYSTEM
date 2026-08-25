import { api } from '@/shared/lib/axios';
import type { ApiSuccess, AuditLog, ListAuditLogsQuery } from '@/types/api';

export interface AuditLogsPage {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchAuditLogs(query: ListAuditLogsQuery): Promise<AuditLogsPage> {
  const res = await api.get<ApiSuccess<AuditLog[]>>('/audit-logs', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}
