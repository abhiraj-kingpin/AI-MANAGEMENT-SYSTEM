import { api } from '@/shared/lib/axios';
import type { ApiSuccess, EmployeeSummary } from '@/types/api';

/** Just the count — `limit: 1` since only `meta.total` is used (see useHeadcount). */
export async function fetchEmployeeCount(): Promise<number> {
  const res = await api.get<ApiSuccess<EmployeeSummary[]>>('/employees', {
    params: { page: 1, limit: 1 },
  });
  return res.data.meta?.total ?? 0;
}
