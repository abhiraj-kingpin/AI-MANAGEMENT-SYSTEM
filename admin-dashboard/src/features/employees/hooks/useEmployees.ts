import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '@/features/employees/api/employeesApi';
import type { ListEmployeesQuery } from '@/types/api';

/** `GET /employees` is Super Admin/HR/Manager only server-side — this screen is only ever reachable by those roles (see router.tsx's role guard), so no client-side `enabled` gate is needed here unlike the dashboard's opportunistic headcount fetch. */
export function useEmployees(query: ListEmployeesQuery) {
  return useQuery({
    queryKey: ['employees', 'list', query],
    queryFn: () => fetchEmployees(query),
    placeholderData: keepPreviousData, // avoids a full-table flash to empty while paginating/filtering
  });
}
