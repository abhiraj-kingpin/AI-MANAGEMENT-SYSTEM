import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { AddLocationForm } from '@/features/geofences/components/AddLocationForm';
import { GeofenceFormModal } from '@/features/geofences/components/GeofenceFormModal';
import { useDeactivateGeofence } from '@/features/geofences/hooks/useGeofenceMutations';
import { useGeofences, useOfficeSummary } from '@/features/geofences/hooks/useGeofences';
import { useSearchStore } from '@/stores/searchStore';
import type { Geofence, GeofenceType } from '@/types/api';

export function GeofencesPage() {
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [addForm, setAddForm] = useState<{ type: GeofenceType; parentId?: string } | null>(null);

  const { data: geofences, isLoading, isError } = useGeofences();
  const { data: summary } = useOfficeSummary();
  const deactivateMutation = useDeactivateGeofence();

  const searchQuery = useSearchStore((s) => s.query);

  const buildings = useMemo(() => (geofences ?? []).filter((g) => g.type === 'building'), [geofences]);
  const roomsByParent = useMemo(() => {
    const map = new Map<string, Geofence[]>();
    for (const g of geofences ?? []) {
      if (g.type === 'building' || !g.parentId) continue;
      const list = map.get(g.parentId);
      if (list) list.push(g);
      else map.set(g.parentId, [g]);
    }
    return map;
  }, [geofences]);
  const summaryByOffice = useMemo(() => new Map((summary ?? []).map((s) => [s.officeId, s])), [summary]);

  const visibleBuildings = buildings.filter((g) => matchesQuery(searchQuery, g.branchName));

  const handleDeactivate = (geofence: Geofence) => {
    if (!window.confirm(`Deactivate "${geofence.branchName}"? GPS check-ins there will stop matching.`)) return;
    deactivateMutation.mutate(geofence.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.14em] text-accent-light uppercase">
          System
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Offices &amp; Locations</h1>
        <p className="mt-1 text-[12.5px] font-medium text-text-dim">
          Geofences GPS check-in matches against, and the floors/rooms inside them
        </p>
      </Reveal>

      {isError ? (
        <Reveal index={1}>
          <Card className="p-8 text-center text-sm text-danger">Couldn't load offices. Try refreshing.</Card>
        </Reveal>
      ) : isLoading && !geofences ? (
        <Reveal index={1}>
          <Card className="p-10 text-center text-sm text-text-dim">Loading…</Card>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {addForm && (
            <Reveal index={1}>
              <AddLocationForm
                key={`${addForm.type}-${addForm.parentId ?? 'none'}`}
                buildings={buildings}
                initialType={addForm.type}
                initialParentId={addForm.parentId}
                onClose={() => setAddForm(null)}
              />
            </Reveal>
          )}

          {visibleBuildings.length === 0 && !addForm ? (
            <div className="col-span-full">
              <Card className="flex flex-col items-center gap-2 p-14 text-center">
                <p className="text-sm text-text-dim">
                  {searchQuery ? `No offices match "${searchQuery}".` : 'No office locations defined yet.'}
                </p>
              </Card>
            </div>
          ) : (
            visibleBuildings.map((building, i) => {
              const rooms = roomsByParent.get(building.id) ?? [];
              const stats = summaryByOffice.get(building.id);
              const side = Math.round(building.radiusMeters * 2);

              return (
                <Reveal key={building.id} index={i + 2}>
                  <Card className="overflow-hidden">
                    <div className="relative h-[150px] bg-[image:linear-gradient(rgb(20_20_60_/_0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(20_20_60_/_0.06)_1px,transparent_1px)] bg-[size:28px_28px] bg-card-subtle">
                      <span className="absolute top-3 left-3.5 font-mono text-[10px] text-text-faint">[ map placeholder ]</span>
                      <div className="absolute top-3 right-3.5">
                        <Chip tone={building.isActive ? 'success' : 'neutral'}>{building.isActive ? 'Active' : 'Inactive'}</Chip>
                      </div>
                      {/* Square geofence with corner survey brackets — a
                          faithful visual for what's stored as a radius. */}
                      <div className="absolute top-1/2 left-1/2 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border-[1.5px] border-dashed border-accent/45 bg-accent/10" />
                      {[
                        ['top-1/2 left-1/2 -translate-x-[59px] -translate-y-[59px] border-t-[2.5px] border-l-[2.5px]'],
                        ['top-1/2 left-1/2 translate-x-[45px] -translate-y-[59px] border-t-[2.5px] border-r-[2.5px]'],
                        ['top-1/2 left-1/2 -translate-x-[59px] translate-y-[45px] border-b-[2.5px] border-l-[2.5px]'],
                        ['top-1/2 left-1/2 translate-x-[45px] translate-y-[45px] border-b-[2.5px] border-r-[2.5px]'],
                      ].map(([cls], idx) => (
                        <div key={idx} className={`absolute h-3.5 w-3.5 border-accent ${cls}`} />
                      ))}
                      <div className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-accent shadow-[0_2px_7px_rgba(20,20,60,0.3)]" />
                      <div className="absolute bottom-3 left-3.5 rounded-lg bg-white px-2 py-1 font-mono text-[10px] font-bold tabular-nums text-text-dim">
                        {side} × {side} m
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-baseline gap-2">
                        <h2 className="flex-1 truncate text-[14.5px] font-extrabold tracking-tight">{building.branchName}</h2>
                        <span className="font-mono text-[11px] tabular-nums text-text-faint">
                          {building.center.lat.toFixed(4)}, {building.center.lng.toFixed(4)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rooms.map((room) => (
                          <span key={room.id} className="rounded-lg bg-card-subtle px-2.5 py-1 text-[10.5px] font-bold text-text-dim">
                            {room.branchName}
                            {room.capacity != null && <span className="text-text-faint"> · {room.capacity}</span>}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAddForm({ type: 'room', parentId: building.id })}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2.5 py-1 text-[10.5px] font-bold text-text-dim hover:bg-ink/[0.04]"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Room
                        </button>
                      </div>

                      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                        <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                          <div className="font-mono text-[14px] tabular-nums">{side} m</div>
                          <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Geofence side</div>
                        </div>
                        <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                          <div className="font-mono text-[14px] tabular-nums">{stats?.assigned ?? 0}</div>
                          <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Assigned</div>
                        </div>
                        <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                          <div className="font-mono text-[14px] tabular-nums">{stats ? `${stats.attendanceRate.toFixed(0)}%` : '—'}</div>
                          <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Attendance</div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingGeofence(building)}
                          className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-text-dim hover:bg-ink/[0.06]"
                        >
                          Edit geofence
                        </button>
                        {building.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(building)}
                            className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-danger hover:bg-danger/10"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })
          )}

          {!addForm && (
            <button
              type="button"
              onClick={() => setAddForm({ type: 'building' })}
              className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 rounded-card border-[1.5px] border-dashed border-border-strong bg-white/50 p-7 text-center transition-colors hover:border-accent/40 hover:bg-accent/[0.03]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-[14px] font-extrabold tracking-tight">Add building or room</span>
              <span className="max-w-[240px] text-[11.5px] font-medium leading-relaxed text-text-dim">
                Register a new site with a square geofence, or add a floor or room inside an existing building.
              </span>
            </button>
          )}
        </div>
      )}

      {editingGeofence && <GeofenceFormModal geofence={editingGeofence} onClose={() => setEditingGeofence(null)} />}
    </div>
  );
}
