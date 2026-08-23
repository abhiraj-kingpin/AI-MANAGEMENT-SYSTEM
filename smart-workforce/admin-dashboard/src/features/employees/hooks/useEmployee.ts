import { useQuery } from '@tanstack/react-query';
import { fetchEmployee } from '@/features/employees/api/employeesApi';

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
  });
}
