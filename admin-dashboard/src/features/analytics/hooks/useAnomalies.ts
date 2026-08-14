import { useQuery } from '@tanstack/react-query';
import { fetchAnomalies } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /analytics/ai/anomalies` is Super Admin/HR only server-side — a Manager has no "my team" reading of an org-wide investigative sweep, same narrower gate as `useDepartmentComparison`. */
export function useAnomalies(days = 30) {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr';

  return useQuery({
    queryKey: ['analytics', 'ai', 'anomalies', days],
    queryFn: () => fetchAnomalies(days),
    enabled: canView,
  });
}
