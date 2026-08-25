import { useQuery } from '@tanstack/react-query';
import { fetchEmployee, fetchEmployeeDocuments } from '@/features/employees/api/employeesApi';

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
  });
}

export function useEmployeeDocuments(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['employees', 'documents', id],
    queryFn: () => fetchEmployeeDocuments(id!),
    enabled: !!id && enabled,
  });
}
