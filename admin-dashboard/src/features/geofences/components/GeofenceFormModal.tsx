import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import {
  useCreateGeofence,
  useUpdateGeofence,
} from '@/features/geofences/hooks/useGeofenceMutations';
import type { Geofence } from '@/types/api';

/** `POST /geofences` / `PATCH /geofences/:id` — one form for both. Lat/lng entered as plain decimal degrees; the backend stores them as GeoJSON `[lng, lat]` (opposite order) but that conversion is the API's concern, not this form's. */
export function GeofenceFormModal({
  geofence,
  onClose,
}: {
  geofence?: Geofence;
  onClose: () => void;
}) {
  const [branchName, setBranchName] = useState(geofence?.branchName ?? '');
  const [lat, setLat] = useState(String(geofence?.center.lat ?? ''));
  const [lng, setLng] = useState(String(geofence?.center.lng ?? ''));
  const [radiusMeters, setRadiusMeters] = useState(String(geofence?.radiusMeters ?? 150));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateGeofence();
  const updateMutation = useUpdateGeofence();
  const mutation = geofence ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = {
      branchName,
      center: { lat: Number(lat), lng: Number(lng) },
      radiusMeters: Number(radiusMeters),
    };
    const onSettled = {
      onSuccess: onClose,
      onError: (err: unknown) => setError(apiErrorMessage(err)),
    };
    if (geofence) {
      updateMutation.mutate({ id: geofence.id, input }, onSettled);
    } else {
      createMutation.mutate(input, onSettled);
    }
  };

  return (
    <Modal title={geofence ? 'Edit Geofence' : 'New Geofence'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Branch Name" htmlFor="geofenceBranch">
          <Input
            id="geofenceBranch"
            required
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g. HQ — Bengaluru"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude" htmlFor="geofenceLat">
            <Input
              id="geofenceLat"
              type="number"
              step="any"
              min={-90}
              max={90}
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </Field>
          <Field label="Longitude" htmlFor="geofenceLng">
            <Input
              id="geofenceLng"
              type="number"
              step="any"
              min={-180}
              max={180}
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Radius (meters)" htmlFor="geofenceRadius">
          <Input
            id="geofenceRadius"
            type="number"
            min={10}
            max={5000}
            required
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            {geofence ? 'Save Changes' : 'Create Geofence'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 text-sm text-text-dim hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
