import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '@/features/employees/api/employeesApi';
import type { ListEmployeesQuery } from '@/types/api';

export function useEmployees(query: ListEmployeesQuery) {
  return useQuery({
    queryKey: ['employees', 'list', query],
    queryFn: () => fetchEmployees(query),
    placeholderData: keepPreviousData,
  });
}
