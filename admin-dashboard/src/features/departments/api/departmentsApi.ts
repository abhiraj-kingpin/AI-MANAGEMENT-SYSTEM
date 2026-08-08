import { api } from '@/shared/lib/axios';
import type { ApiSuccess, Department } from '@/types/api';

export async function fetchDepartments(): Promise<Department[]> {
  const res = await api.get<ApiSuccess<Department[]>>('/departments');
  return res.data.data;
}
