import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  ApplyLeaveInput,
  Leave,
  LeaveBalance,
  ListLeavesQuery,
} from '@/types/api';

export interface LeavesPage {
  items: Leave[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchMyLeaves(status?: Leave['status']): Promise<Leave[]> {
  const res = await api.get<ApiSuccess<Leave[]>>('/leaves/me', {
    params: status ? { status } : undefined,
  });
  return res.data.data;
}

export async function fetchMyBalance(): Promise<LeaveBalance[]> {
  const res = await api.get<ApiSuccess<LeaveBalance[]>>('/leaves/balance');
  return res.data.data;
}

export async function applyLeave(input: ApplyLeaveInput): Promise<Leave> {
  const res = await api.post<ApiSuccess<{ leave: Leave }>>('/leaves', input);
  return res.data.data.leave;
}

export async function cancelLeave(id: string): Promise<Leave> {
  const res = await api.patch<ApiSuccess<{ leave: Leave }>>(`/leaves/${id}/cancel`);
  return res.data.data.leave;
}

export async function fetchLeaves(query: ListLeavesQuery): Promise<LeavesPage> {
  const res = await api.get<ApiSuccess<Leave[]>>('/leaves', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

export async function approveLeave(id: string, comment?: string): Promise<Leave> {
  const res = await api.patch<ApiSuccess<{ leave: Leave }>>(`/leaves/${id}/approve`, { comment });
  return res.data.data.leave;
}

export async function rejectLeave(id: string, comment: string): Promise<Leave> {
  const res = await api.patch<ApiSuccess<{ leave: Leave }>>(`/leaves/${id}/reject`, { comment });
  return res.data.data.leave;
}
