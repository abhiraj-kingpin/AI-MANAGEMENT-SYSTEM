import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  AttendanceTrendPoint,
  DashboardKpis,
  DepartmentComparison,
} from '@/types/api';

/** Today's snapshot — org-wide for Super Admin/HR, own-team for a Manager (scoped server-side, see backend/README.md#analytics-analytics). */
export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const res = await api.get<ApiSuccess<DashboardKpis>>('/analytics/dashboard');
  return res.data.data;
}

/** Team-scoped for a Manager, org-wide for Super Admin/HR — same scoping as `fetchDashboardKpis`. */
export async function fetchAttendanceTrend(months = 6): Promise<AttendanceTrendPoint[]> {
  const res = await api.get<ApiSuccess<AttendanceTrendPoint[]>>('/analytics/attendance-trend', {
    params: { months },
  });
  return res.data.data;
}

/** Super Admin/HR only — no "my team" reading of a cross-department comparison. */
export async function fetchDepartmentComparison(): Promise<DepartmentComparison[]> {
  const res = await api.get<ApiSuccess<DepartmentComparison[]>>('/analytics/department-comparison');
  return res.data.data;
}
