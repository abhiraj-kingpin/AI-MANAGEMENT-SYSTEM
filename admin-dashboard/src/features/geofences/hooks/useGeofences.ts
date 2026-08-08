import { useQuery } from '@tanstack/react-query';
import { fetchGeofences } from '@/features/geofences/api/geofencesApi';

/** `GET /geofences` is Super Admin/HR only server-side — this screen is only reachable by those roles (see Sidebar), so no client-side `enabled` gate is needed here, same as `useAttendance`. */
export function useGeofences(includeInactive = false) {
  return useQuery({
    queryKey: ['geofences', 'list', includeInactive],
    queryFn: () => fetchGeofences(includeInactive),
  });
}
