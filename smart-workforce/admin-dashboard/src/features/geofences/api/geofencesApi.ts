import { api } from '@/shared/lib/axios';
import type { ApiSuccess, CreateGeofenceInput, Geofence, UpdateGeofenceInput } from '@/types/api';

export async function fetchGeofences(includeInactive = false): Promise<Geofence[]> {
  const res = await api.get<ApiSuccess<Geofence[]>>('/geofences', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return res.data.data;
}

export async function createGeofence(input: CreateGeofenceInput): Promise<Geofence> {
  const res = await api.post<ApiSuccess<{ geofence: Geofence }>>('/geofences', input);
  return res.data.data.geofence;
}

export async function updateGeofence(id: string, input: UpdateGeofenceInput): Promise<Geofence> {
  const res = await api.patch<ApiSuccess<{ geofence: Geofence }>>(`/geofences/${id}`, input);
  return res.data.data.geofence;
}

export async function deactivateGeofence(id: string): Promise<void> {
  await api.delete<ApiSuccess<{ status: string }>>(`/geofences/${id}`);
}
