import { api } from '@/shared/lib/axios';
import type { ApiSuccess, LeaveType } from '@/types/api';

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const res = await api.get<ApiSuccess<LeaveType[]>>('/leave-types');
  return res.data.data;
}
