import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchSalaries } from '@/features/payroll/api/payrollApi';
import type { ListSalariesQuery } from '@/types/api';

export function useSalaries(query: ListSalariesQuery, enabled = true) {
  return useQuery({
    queryKey: ['salaries', 'list', query],
    queryFn: () => fetchSalaries(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
