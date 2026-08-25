import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  CreateEmployeeInput,
  Employee,
  EmployeeDocument,
  EmployeeSummary,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from '@/types/api';

export async function fetchEmployeeCount(): Promise<number> {
  const res = await api.get<ApiSuccess<EmployeeSummary[]>>('/employees', {
    params: { page: 1, limit: 1 },
  });
  return res.data.meta?.total ?? 0;
}

export interface EmployeePage {
  items: Employee[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchEmployees(query: ListEmployeesQuery): Promise<EmployeePage> {
  const res = await api.get<ApiSuccess<Employee[]>>('/employees', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const res = await api.get<ApiSuccess<{ employee: Employee }>>(`/employees/${id}`);
  return res.data.data.employee;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const res = await api.post<ApiSuccess<{ employee: Employee }>>('/employees', input);
  return res.data.data.employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
  const res = await api.patch<ApiSuccess<{ employee: Employee }>>(`/employees/${id}`, input);
  return res.data.data.employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function fetchEmployeeDocuments(id: string): Promise<EmployeeDocument[]> {
  const res = await api.get<ApiSuccess<EmployeeDocument[]>>(`/employees/${id}/documents`);
  return res.data.data;
}

export async function searchEmployees(q: string): Promise<EmployeeSummary[]> {
  if (!q.trim()) return [];
  const res = await api.get<ApiSuccess<EmployeeSummary[]>>('/employees/search', { params: { q } });
  return res.data.data;
}
