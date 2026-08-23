import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentComparison } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

export function useDepartmentComparison() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr';

  return useQuery({
    queryKey: ['analytics', 'department-comparison'],
    queryFn: fetchDepartmentComparison,
    enabled: canView,
  });
}
