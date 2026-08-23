import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '@/features/departments/api/departmentsApi';

export function useDepartments(includeInactive = false) {
  return useQuery({
    queryKey: ['departments', 'list', includeInactive],
    queryFn: () => fetchDepartments(includeInactive),
  });
}
