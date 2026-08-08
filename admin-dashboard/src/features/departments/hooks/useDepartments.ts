import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '@/features/departments/api/departmentsApi';

/** `GET /departments` is open to any authenticated user — no role gate needed here, unlike useHeadcount/useDashboardKpis. */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });
}
