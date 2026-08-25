import { useQuery } from '@tanstack/react-query';
import { fetchGeofences, fetchOfficeSummary } from '@/features/geofences/api/geofencesApi';

export function useGeofences(includeInactive = false) {
  return useQuery({
    queryKey: ['geofences', 'list', includeInactive],
    queryFn: () => fetchGeofences(includeInactive),
  });
}

export function useOfficeSummary() {
  return useQuery({
    queryKey: ['geofences', 'summary'],
    queryFn: fetchOfficeSummary,
  });
}
