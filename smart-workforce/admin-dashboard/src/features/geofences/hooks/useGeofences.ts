import { useQuery } from '@tanstack/react-query';
import { fetchGeofences } from '@/features/geofences/api/geofencesApi';

export function useGeofences(includeInactive = false) {
  return useQuery({
    queryKey: ['geofences', 'list', includeInactive],
    queryFn: () => fetchGeofences(includeInactive),
  });
}
