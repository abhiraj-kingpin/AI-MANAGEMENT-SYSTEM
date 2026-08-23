import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from '@/types/api';

export async function fetchDepartments(includeInactive = false): Promise<Department[]> {
  const res = await api.get<ApiSuccess<Department[]>>('/departments', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return res.data.data;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const res = await api.post<ApiSuccess<{ department: Department }>>('/departments', input);
  return res.data.data.department;
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
): Promise<Department> {
  const res = await api.patch<ApiSuccess<{ department: Department }>>(
    `/departments/${id}`,
    input,
  );
  return res.data.data.department;
}
