import { api } from '@/shared/lib/axios';
import type { ApiSuccess, FaceEnrollmentRow, FaceEnrollmentStats } from '@/types/api';

export async function fetchFaceEnrollments(): Promise<FaceEnrollmentRow[]> {
  const res = await api.get<ApiSuccess<FaceEnrollmentRow[]>>('/face/admin/enrollments');
  return res.data.data;
}

export async function fetchFaceStats(): Promise<FaceEnrollmentStats> {
  const res = await api.get<ApiSuccess<FaceEnrollmentStats>>('/face/admin/stats');
  return res.data.data;
}

export async function deleteFaceData(employeeId: string): Promise<void> {
  await api.delete<ApiSuccess<{ status: string }>>(`/face/${employeeId}`);
}
