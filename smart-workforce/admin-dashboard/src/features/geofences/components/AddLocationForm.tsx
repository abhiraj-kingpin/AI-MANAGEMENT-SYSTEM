import { type FormEvent, useState } from 'react';
import { Field, Input } from '@/shared/ui/Field';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useCreateGeofence } from '@/features/geofences/hooks/useGeofenceMutations';
import { pushToast } from '@/stores/toastStore';
import type { Geofence, GeofenceType } from '@/types/api';

const TYPE_OPTIONS: Array<{ value: GeofenceType; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'floor', label: 'Floor' },
  { value: 'room', label: 'Room' },
];

export function AddLocationForm({
  buildings,
  initialType = 'building',
  initialParentId,
  onClose,
}: {
  buildings: Geofence[];
  initialType?: GeofenceType;
  initialParentId?: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<GeofenceType>(initialType);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(initialParentId ?? buildings[0]?.id ?? '');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [side, setSide] = useState('160');
  const [capacity, setCapacity] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateGeofence();

  const isBuilding = type === 'building';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isBuilding) {
      createMutation.mutate(
        {
          branchName: name,
          type: 'building',
          center: { lat: Number(lat), lng: Number(lng) },
          radiusMeters: Number(side) / 2,
        },
        {
          onSuccess: () => {
            pushToast(`${name} added`);
            onClose();
          },
          onError: (err) => setError(apiErrorMessage(err)),
        },
      );
      return;
    }

    if (!parentId) {
      setError('Pick a parent building.');
      return;
    }
    createMutation.mutate(
      { branchName: name, type, parentId, capacity: Number(capacity) },
      {
        onSuccess: () => {
          pushToast(`${name} added`);
          onClose();
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <div className="col-span-full rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">Add a location</h2>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Buildings carry their own geofence. Floors and rooms sit inside a building and inherit it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card-subtle text-text-dim hover:bg-ink/[0.06]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-text-dim">Type</p>
          <div className="flex gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  type === opt.value ? 'bg-ink text-white' : 'bg-card-subtle text-text-dim hover:bg-ink/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field label="Name" htmlFor="locName">
            <Input
              id="locName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBuilding ? 'e.g. HQ Building 4' : 'e.g. Floor 2 — Engineering'}
            />
          </Field>

          {isBuilding ? (
            <>
              <Field label="Coordinates (lat, lng)" htmlFor="locCoords">
                <div className="flex gap-2">
                  <Input id="locCoords" type="number" step="any" required placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} />
                  <Input type="number" step="any" required placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} />
                </div>
              </Field>
              <Field label="Geofence side (meters)" htmlFor="locSide">
                <Input id="locSide" type="number" min={20} max={10000} required value={side} onChange={(e) => setSide(e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Parent building" htmlFor="locParent">
                <select
                  id="locParent"
                  required
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14.5px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
                >
                  <option value="" disabled>
                    Select a building…
                  </option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Capacity" htmlFor="locCapacity">
                <Input id="locCapacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </Field>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <p className="flex-1 text-[11.5px] text-text-dim">
            {isBuilding
              ? 'GPS check-ins match against this geofence.'
              : "Floors and rooms don't carry their own geofence — they inherit the building's."}
          </p>
          <button type="button" onClick={onClose} className="rounded-2xl bg-card-subtle px-4.5 py-3 text-[12.5px] font-bold text-text-dim">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-2xl bg-accent px-5 py-3 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(20,48,79,0.55)] disabled:opacity-60"
          >
            {createMutation.isPending ? 'Adding…' : `Add ${type}`}
          </button>
        </div>
      </form>
    </div>
  );
}
