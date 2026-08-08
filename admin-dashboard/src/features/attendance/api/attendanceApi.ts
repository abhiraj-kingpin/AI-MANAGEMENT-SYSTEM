import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  Attendance,
  CorrectAttendanceInput,
  ListAttendanceQuery,
} from '@/types/api';

export interface AttendancePage {
  items: Attendance[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchAttendance(query: ListAttendanceQuery): Promise<AttendancePage> {
  const res = await api.get<ApiSuccess<Attendance[]>>('/attendance', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

// Unlike /employees or /departments, these three send the DTO directly as
// `data` (attendance.controller.ts calls `sendSuccess(res, result)`, not
// `sendSuccess(res, { attendance: result })`) — checked against the actual
// controller rather than assumed from the other modules' convention.
export async function correctAttendance(
  id: string,
  input: CorrectAttendanceInput,
): Promise<Attendance> {
  const res = await api.patch<ApiSuccess<Attendance>>(`/attendance/${id}/correct`, input);
  return res.data.data;
}

export async function approveCorrection(id: string, comment?: string): Promise<Attendance> {
  const res = await api.post<ApiSuccess<Attendance>>(`/attendance/${id}/approve-correction`, {
    comment,
  });
  return res.data.data;
}

export async function rejectCorrection(id: string, comment?: string): Promise<Attendance> {
  const res = await api.post<ApiSuccess<Attendance>>(`/attendance/${id}/reject-correction`, {
    comment,
  });
  return res.data.data;
}
