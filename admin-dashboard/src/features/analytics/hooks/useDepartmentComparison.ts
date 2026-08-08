import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentComparison } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /analytics/department-comparison` is Super Admin/HR only server-side — a Manager has no "my team" reading of a cross-department report, so this is a narrower gate than `useDashboardKpis`/`useAttendanceTrend`. */
export function useDepartmentComparison() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr';

  return useQuery({
    queryKey: ['analytics', 'department-comparison'],
    queryFn: fetchDepartmentComparison,
    enabled: canView,
  });
}
