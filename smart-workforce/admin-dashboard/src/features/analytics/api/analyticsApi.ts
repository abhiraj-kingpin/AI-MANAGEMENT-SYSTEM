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

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const res = await api.get<ApiSuccess<DashboardKpis>>('/analytics/dashboard');
  return res.data.data;
}

export async function fetchAttendanceTrend(months = 6): Promise<AttendanceTrendPoint[]> {
  const res = await api.get<ApiSuccess<AttendanceTrendPoint[]>>('/analytics/attendance-trend', {
    params: { months },
  });
  return res.data.data;
}

export async function fetchDepartmentComparison(): Promise<DepartmentComparison[]> {
  const res = await api.get<ApiSuccess<DepartmentComparison[]>>('/analytics/department-comparison');
  return res.data.data;
}

export async function fetchLateRisk(days = 30, limit = 20): Promise<LateRiskEmployee[]> {
  const res = await api.get<ApiSuccess<LateRiskEmployee[]>>('/analytics/ai/late-risk', {
    params: { days, limit },
  });
  return res.data.data;
}

export async function fetchAbsenteeismForecast(months = 6): Promise<AbsenteeismForecast> {
  const res = await api.get<ApiSuccess<AbsenteeismForecast>>('/analytics/ai/absenteeism-trend', {
    params: { months },
  });
  return res.data.data;
}

export async function fetchAnomalies(days = 30): Promise<Anomaly[]> {
  const res = await api.get<ApiSuccess<Anomaly[]>>('/analytics/ai/anomalies', {
    params: { days },
  });
  return res.data.data;
}

export interface ExportRange {
  from: string;
  to: string;
  departmentId?: string;
}

async function downloadBlob(url: string, params: object, filename: string): Promise<void> {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function exportAttendanceCsv(range: ExportRange): Promise<void> {
  return downloadBlob('/analytics/export/csv', range, `attendance-${range.from}-to-${range.to}.csv`);
}

export function exportAttendancePdf(range: ExportRange): Promise<void> {
  return downloadBlob('/analytics/export/pdf', range, `attendance-${range.from}-to-${range.to}.pdf`);
}

// Excel export lives on /attendance (built for the Attendance log), not
// /analytics — reused here rather than duplicated server-side.
export function exportAttendanceExcel(range: ExportRange): Promise<void> {
  return downloadBlob('/attendance/export/excel', range, `attendance-${range.from}-to-${range.to}.xlsx`);
}
