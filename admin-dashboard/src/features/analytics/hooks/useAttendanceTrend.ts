import { useQuery } from '@tanstack/react-query';
import { fetchAttendanceTrend } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /analytics/attendance-trend` is Super Admin/HR/Manager-only server-side — same reasoning as `useDashboardKpis`. */
export function useAttendanceTrend(months = 6) {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['analytics', 'attendance-trend', months],
    queryFn: () => fetchAttendanceTrend(months),
    enabled: canView,
  });
}
