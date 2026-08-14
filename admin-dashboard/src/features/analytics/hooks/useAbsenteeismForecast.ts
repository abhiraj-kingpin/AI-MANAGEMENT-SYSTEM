import { useQuery } from '@tanstack/react-query';
import { fetchAbsenteeismForecast } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /analytics/ai/absenteeism-trend` is Super Admin/HR/Manager-only server-side — same reasoning as `useLateRisk`. */
export function useAbsenteeismForecast(months = 6) {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['analytics', 'ai', 'absenteeism-trend', months],
    queryFn: () => fetchAbsenteeismForecast(months),
    enabled: canView,
  });
}
