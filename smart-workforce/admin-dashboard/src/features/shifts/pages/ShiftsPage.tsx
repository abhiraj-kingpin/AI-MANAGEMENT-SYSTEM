import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { AssignShiftModal } from '@/features/shifts/components/AssignShiftModal';
import { RosterGrid } from '@/features/shifts/components/RosterGrid';
import { ShiftFormModal } from '@/features/shifts/components/ShiftFormModal';
import { useDeactivateShift } from '@/features/shifts/hooks/useShiftMutations';
import { useRoster, useShifts } from '@/features/shifts/hooks/useShifts';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { Shift } from '@/types/api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const TYPE_LABEL: Record<Shift['type'], string> = {
  morning: 'Morning',
  night: 'Night',
  rotational: 'Rotational',
  flexible: 'Flexible',
};

export function ShiftsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  const [editingShift, setEditingShift] = useState<Shift | 'new' | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const {
    data: shifts,
    isLoading: shiftsLoading,
    isError: shiftsError,
  } = useShifts(false, canManage);
  const deactivateMutation = useDeactivateShift();

  // Today's snapshot of who's on which shift — powers the template cards'
  // "assigned" count and coverage bar (out of everyone with a shift today).
  const { data: todaysAssignments } = useRoster({ from: todayIso(), to: todayIso() }, canManage);
  const assignedCountByShift = useMemo(() => {
    const counts = new Map<string, number>();
    let totalAssigned = 0;
    for (const row of todaysAssignments ?? []) {
      const active = row.assignments.find((a) => {
        const from = a.effectiveFrom.slice(0, 10);
        const to = a.effectiveTo ? a.effectiveTo.slice(0, 10) : null;
        const today = todayIso();
        return from <= today && (!to || to >= today);
      });
      if (!active) continue;
      totalAssigned += 1;
      counts.set(active.shift.id, (counts.get(active.shift.id) ?? 0) + 1);
    }
    return { counts, totalAssigned };
  }, [todaysAssignments]);

  const searchQuery = useSearchStore((s) => s.query);
  const visibleShifts = (shifts ?? []).filter((shift) =>
    matchesQuery(searchQuery, shift.name, TYPE_LABEL[shift.type]),
  );

  const handleDeactivate = (shift: Shift) => {
    if (!window.confirm(`Deactivate "${shift.name}"? Existing assignments keep working.`)) return;
    deactivateMutation.mutate(shift.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Scheduling
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Shifts</h1>
        </Reveal>
        <Reveal index={1}>
          <Card className="flex flex-col items-center gap-2 p-14 text-center">
            <p className="text-sm text-text-dim">
              This console is for defining shifts and assigning them across the team — check your
              own shift from the mobile app instead.
            </p>
          </Card>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Scheduling
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Shifts</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setIsAssigning(true)}>
            Assign Shift
          </Button>
          <Button onClick={() => setEditingShift('new')}>New Shift</Button>
        </div>
      </Reveal>

      {shifts && shifts.length > 0 && (
        <Reveal index={1}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shifts.map((shift) => {
              const assigned = assignedCountByShift.counts.get(shift.id) ?? 0;
              const coverage = assignedCountByShift.totalAssigned
                ? Math.round((assigned / assignedCountByShift.totalAssigned) * 100)
                : 0;
              return (
                <Card key={shift.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-extrabold">{shift.name}</span>
                    <Chip tone={shift.isActive ? 'success' : 'neutral'}>
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </Chip>
                  </div>
                  <div className="mt-2.5 font-mono text-[16px] font-bold tabular-nums">
                    {shift.startTime}–{shift.endTime}
                  </div>
                  <div className="mt-1 text-[11.5px] font-medium text-text-dim">
                    {assigned} assigned today · grace {shift.gracePeriodMinutes}m
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-ink/[0.06]">
                    <div
                      className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-light"
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-text-dim">
                    {coverage}% of today's assigned headcount
                  </div>
                </Card>
              );
            })}
          </div>
        </Reveal>
      )}

      <Reveal index={2}>
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-bold">Shift Definitions</h2>
          </div>
            {shiftsError ? (
              <p className="p-8 text-center text-sm text-danger">
                Couldn't load shifts. Try refreshing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3.5 font-bold">Name</th>
                      <th className="px-5 py-3.5 font-bold">Type</th>
                      <th className="px-5 py-3.5 font-bold">Hours</th>
                      <th className="px-5 py-3.5 font-bold">Grace Period</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftsLoading && !shifts ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                          Loading…
                        </td>
                      </tr>
                    ) : visibleShifts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                          {searchQuery ? `No shifts match "${searchQuery}".` : 'No shifts defined yet.'}
                        </td>
                      </tr>
                    ) : (
                      visibleShifts.map((shift) => (
                        <tr
                          key={shift.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                        >
                          <td className="px-5 py-3.5 font-semibold text-text">{shift.name}</td>
                          <td className="px-5 py-3.5 text-text-dim">{TYPE_LABEL[shift.type]}</td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {shift.startTime}–{shift.endTime}
                          </td>
                          <td className="px-5 py-3.5 text-text-dim">
                            {shift.gracePeriodMinutes} min
                          </td>
                          <td className="px-5 py-3.5">
                            <Chip tone={shift.isActive ? 'success' : 'neutral'}>
                              {shift.isActive ? 'Active' : 'Inactive'}
                            </Chip>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingShift(shift)}
                                className="text-[12.5px] font-semibold text-accent-light hover:underline"
                              >
                                Edit
                              </button>
                              {shift.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(shift)}
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

      {canManage && shifts && shifts.length > 0 && (
        <Reveal index={3}>
          <RosterGrid shifts={shifts} />
        </Reveal>
      )}

      {editingShift && (
        <ShiftFormModal
          shift={editingShift === 'new' ? undefined : editingShift}
          onClose={() => setEditingShift(null)}
        />
      )}
      {isAssigning && (
        <AssignShiftModal shifts={shifts ?? []} onClose={() => setIsAssigning(false)} />
      )}
    </div>
  );
}
