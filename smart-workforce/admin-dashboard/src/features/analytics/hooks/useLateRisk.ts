import { useQuery } from '@tanstack/react-query';
import { fetchLateRisk } from '@/features/analytics/api/analyticsApi';
import { useAuthStore } from '@/stores/authStore';

export function useLateRisk(days = 30, limit = 20) {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['analytics', 'ai', 'late-risk', days, limit],
    queryFn: () => fetchLateRisk(days, limit),
    enabled: canView,
  });
}
