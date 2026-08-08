import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { GeofenceFormModal } from '@/features/geofences/components/GeofenceFormModal';
import { useDeactivateGeofence } from '@/features/geofences/hooks/useGeofenceMutations';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import type { Geofence } from '@/types/api';

/** Super Admin/HR only — this page is only reachable by those roles (see Sidebar), same reasoning as AttendancePage. No self-service half exists: an employee checks in *against* a geofence, they never manage one. */
export function GeofencesPage() {
  const [editingGeofence, setEditingGeofence] = useState<Geofence | 'new' | null>(null);
  const { data: geofences, isLoading, isError } = useGeofences();
  const deactivateMutation = useDeactivateGeofence();

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
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Configuration
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Geofences</h1>
        </div>
        <Button onClick={() => setEditingGeofence('new')}>New Geofence</Button>
      </Reveal>

      <Reveal index={1}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load geofences. Try refreshing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Branch</th>
                    <th className="px-5 py-3.5 font-bold">Center</th>
                    <th className="px-5 py-3.5 font-bold">Radius</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !geofences ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : geofences && geofences.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        No office locations defined yet.
                      </td>
                    </tr>
                  ) : (
                    geofences?.map((geofence) => (
                      <tr
                        key={geofence.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5 font-semibold text-text">
                          {geofence.branchName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[12.5px] text-text-dim">
                          {geofence.center.lat.toFixed(5)}, {geofence.center.lng.toFixed(5)}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">{geofence.radiusMeters} m</td>
                        <td className="px-5 py-3.5">
                          <Chip tone={geofence.isActive ? 'success' : 'neutral'}>
                            {geofence.isActive ? 'Active' : 'Inactive'}
                          </Chip>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingGeofence(geofence)}
                              className="text-[12.5px] font-semibold text-accent-light hover:underline"
                            >
                              Edit
                            </button>
                            {geofence.isActive && (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(geofence)}
                                className="text-[12.5px] font-semibold text-danger hover:underline"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>

      {editingGeofence && (
        <GeofenceFormModal
          geofence={editingGeofence === 'new' ? undefined : editingGeofence}
          onClose={() => setEditingGeofence(null)}
        />
      )}
    </div>
  );
}
