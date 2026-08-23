import { useQuery } from '@tanstack/react-query';
import { fetchActiveQr } from '@/features/qr/api/qrApi';

export function useActiveQr(geofenceId: string | null) {
  return useQuery({
    queryKey: ['qr', 'active', geofenceId],
    queryFn: () => fetchActiveQr(geofenceId as string),
    enabled: geofenceId !== null,
  });
}
