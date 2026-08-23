import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKpis } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

export function useDashboardKpis() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: fetchDashboardKpis,
    enabled: canView,
  });
}
