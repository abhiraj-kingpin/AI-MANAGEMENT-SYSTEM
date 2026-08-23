import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { GeofenceFormModal } from '@/features/geofences/components/GeofenceFormModal';
import { useDeactivateGeofence } from '@/features/geofences/hooks/useGeofenceMutations';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import { useSearchStore } from '@/stores/searchStore';
import type { Geofence } from '@/types/api';

export function GeofencesPage() {
  const [editingGeofence, setEditingGeofence] = useState<Geofence | 'new' | null>(null);
  const { data: geofences, isLoading, isError } = useGeofences();
  const deactivateMutation = useDeactivateGeofence();

  const searchQuery = useSearchStore((s) => s.query);
  const visibleGeofences = (geofences ?? []).filter((g) => matchesQuery(searchQuery, g.branchName));

  const handleDeactivate = (geofence: Geofence) => {
    if (
      !window.confirm(
        `Deactivate "${geofence.branchName}"? GPS check-ins there will stop matching.`,
      )
    )
      return;
    deactivateMutation.mutate(geofence.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.14em] text-accent-light uppercase">
            Configuration
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Offices &amp; Locations</h1>
          <p className="mt-1 text-[12.5px] font-medium text-text-dim">
            Geofences GPS check-in matches against
          </p>
        </div>
        <Button onClick={() => setEditingGeofence('new')}>New Geofence</Button>
      </Reveal>

      {isError ? (
        <Reveal index={1}>
          <Card className="p-8 text-center text-sm text-danger">
            Couldn't load geofences. Try refreshing.
          </Card>
        </Reveal>
      ) : isLoading && !geofences ? (
        <Reveal index={1}>
          <Card className="p-10 text-center text-sm text-text-dim">Loading…</Card>
        </Reveal>
      ) : visibleGeofences.length === 0 ? (
        <Reveal index={1}>
          <Card className="flex flex-col items-center gap-2 p-14 text-center">
            <span className="text-2xl" aria-hidden="true">
              ◎
            </span>
            <p className="text-sm text-text-dim">
              {searchQuery
                ? `No geofences match "${searchQuery}".`
                : 'No office locations defined yet.'}
            </p>
          </Card>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleGeofences.map((geofence, i) => (
            <Reveal key={geofence.id} index={i + 1}>
              <GeofenceCard
                geofence={geofence}
                onEdit={() => setEditingGeofence(geofence)}
                onDeactivate={() => handleDeactivate(geofence)}
                isDeactivating={
                  deactivateMutation.isPending && deactivateMutation.variables === geofence.id
                }
              />
            </Reveal>
          ))}
        </div>
      )}

      {editingGeofence && (
        <GeofenceFormModal
          geofence={editingGeofence === 'new' ? undefined : editingGeofence}
          onClose={() => setEditingGeofence(null)}
        />
      )}
    </div>
  );
}

function GeofenceCard({
  geofence,
  onEdit,
  onDeactivate,
  isDeactivating,
}: {
  geofence: Geofence;
  onEdit: () => void;
  onDeactivate: () => void;
  isDeactivating: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Map placeholder: a faint coordinate grid with a dashed geofence
          ring and center pin, sized proportionally to the radius so a
          150m geofence visibly reads larger than an 80m one. */}
      <div className="relative h-[150px] bg-[image:linear-gradient(rgb(20_20_60_/_0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(20_20_60_/_0.06)_1px,transparent_1px)] bg-[size:28px_28px] bg-card-subtle">
        <span className="absolute top-3 left-3.5 font-mono text-[10px] text-text-faint">
          [ map placeholder ]
        </span>
        <div className="absolute top-3 right-3.5">
          <Chip tone={geofence.isActive ? 'success' : 'neutral'}>
            {geofence.isActive ? 'Active' : 'Inactive'}
          </Chip>
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-accent/45 bg-accent/10"
          style={{
            width: Math.min(130, Math.max(56, geofence.radiusMeters / 2)),
            height: Math.min(130, Math.max(56, geofence.radiusMeters / 2)),
          }}
        />
        <div className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-accent shadow-[0_2px_7px_rgba(20,20,60,0.3)]" />
      </div>

      <div className="p-4">
        <div className="flex items-baseline gap-2">
          <h2 className="flex-1 truncate text-[14.5px] font-extrabold tracking-tight">
            {geofence.branchName}
          </h2>
          <span className="font-mono text-[11px] text-text-faint">
            {geofence.center.lat.toFixed(4)}, {geofence.center.lng.toFixed(4)}
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
            <div className="font-mono text-[14px]">{geofence.radiusMeters} m</div>
            <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Geofence radius</div>
          </div>
          <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
            <div className="font-mono text-[14px]">
              {new Date(geofence.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Added</div>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-text-dim transition-colors hover:bg-ink/[0.06]"
          >
            Edit geofence
          </button>
          {geofence.isActive && (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={isDeactivating}
              className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {isDeactivating ? 'Deactivating…' : 'Deactivate'}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
