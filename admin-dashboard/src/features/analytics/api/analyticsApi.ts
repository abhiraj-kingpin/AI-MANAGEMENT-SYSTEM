import { api } from '@/shared/lib/axios';
import type { ApiSuccess, DashboardKpis } from '@/types/api';

/** Today's snapshot — org-wide for Super Admin/HR, own-team for a Manager (scoped server-side, see backend/README.md#analytics-analytics). */
export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const res = await api.get<ApiSuccess<DashboardKpis>>('/analytics/dashboard');
  return res.data.data;
}
