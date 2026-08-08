import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchSalaries } from '@/features/payroll/api/payrollApi';
import type { ListSalariesQuery } from '@/types/api';

/** `GET /salaries` is Super Admin/HR only server-side — only called from the role-gated section of PayrollPage (see PayrollPage's `canManage`). */
export function useSalaries(query: ListSalariesQuery, enabled = true) {
  return useQuery({
    queryKey: ['salaries', 'list', query],
    queryFn: () => fetchSalaries(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
