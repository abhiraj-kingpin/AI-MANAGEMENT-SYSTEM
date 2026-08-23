import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createGeofence,
  deactivateGeofence,
  updateGeofence,
} from '@/features/geofences/api/geofencesApi';
import type { CreateGeofenceInput, UpdateGeofenceInput } from '@/types/api';

export function useCreateGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGeofenceInput) => createGeofence(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
  });
}

export function useUpdateGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGeofenceInput }) =>
      updateGeofence(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
  });
}

export function useDeactivateGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateGeofence(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
  });
}
