import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKpis } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /analytics/dashboard` is Super Admin/HR/Manager-only server-side — same reasoning as useHeadcount: don't fire the request for a role that would just 403 in the background. */
export function useDashboardKpis() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: fetchDashboardKpis,
    enabled: canView,
  });
}
