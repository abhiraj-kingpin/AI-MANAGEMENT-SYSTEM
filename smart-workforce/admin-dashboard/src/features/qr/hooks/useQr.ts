import { useQuery } from '@tanstack/react-query';
import { fetchActiveQr, fetchRecentQrCodes } from '@/features/qr/api/qrApi';

export function useActiveQr(geofenceId: string | null) {
  return useQuery({
    queryKey: ['qr', 'active', geofenceId],
    queryFn: () => fetchActiveQr(geofenceId as string),
    enabled: geofenceId !== null,
  });
}

export function useRecentQrCodes() {
  return useQuery({
    queryKey: ['qr', 'recent'],
    queryFn: fetchRecentQrCodes,
  });
}
