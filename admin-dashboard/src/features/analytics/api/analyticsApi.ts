import { api } from '@/shared/lib/axios';
import type {
  AbsenteeismForecast,
  Anomaly,
  ApiSuccess,
  AttendanceTrendPoint,
  DashboardKpis,
  DepartmentComparison,
  LateRiskEmployee,
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

/** Team-scoped for a Manager, org-wide for Super Admin/HR — same scoping as `fetchAttendanceTrend`. */
export async function fetchLateRisk(days = 30, limit = 20): Promise<LateRiskEmployee[]> {
  const res = await api.get<ApiSuccess<LateRiskEmployee[]>>('/analytics/ai/late-risk', {
    params: { days, limit },
  });
  return res.data.data;
}

/** Team-scoped like `fetchLateRisk`. */
export async function fetchAbsenteeismForecast(months = 6): Promise<AbsenteeismForecast> {
  const res = await api.get<ApiSuccess<AbsenteeismForecast>>('/analytics/ai/absenteeism-trend', {
    params: { months },
  });
  return res.data.data;
}

/** Super Admin/HR only — no "my team" reading, same gating as `fetchDepartmentComparison`. */
export async function fetchAnomalies(days = 30): Promise<Anomaly[]> {
  const res = await api.get<ApiSuccess<Anomaly[]>>('/analytics/ai/anomalies', {
    params: { days },
  });
  return res.data.data;
}
