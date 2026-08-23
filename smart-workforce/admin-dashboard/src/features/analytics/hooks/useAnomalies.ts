import { useQuery } from '@tanstack/react-query';
import { fetchAnomalies } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

export function useAnomalies(days = 30) {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr';

  return useQuery({
    queryKey: ['analytics', 'ai', 'anomalies', days],
    queryFn: () => fetchAnomalies(days),
    enabled: canView,
  });
}
