import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { AssignShiftModal } from '@/features/shifts/components/AssignShiftModal';
import type { EmployeeOption } from '@/features/employees/components/EmployeePicker';
import { useRoster } from '@/features/shifts/hooks/useShifts';
import { useBroadcastNotification } from '@/features/notifications/hooks/useNotificationMutations';
import { pushToast } from '@/stores/toastStore';
import type { RosterEmployee, Shift } from '@/types/api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftCode(name: string): string {
  const words = name.split(' ').filter(Boolean);
  return words.length > 1 ? words.map((w) => w[0]).join('').toUpperCase() : name.slice(0, 3).toUpperCase();
}

function assignmentFor(row: RosterEmployee, dateKey: string) {
  return row.assignments.find((a) => {
    const from = a.effectiveFrom.slice(0, 10);
    const to = a.effectiveTo ? a.effectiveTo.slice(0, 10) : null;
    return from <= dateKey && (!to || to >= dateKey);
  });
}

const SHIFT_TONES = [
  'bg-accent/10 text-accent',
  'bg-accent-2/10 text-accent-2',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
];

export function RosterGrid({ shifts }: { shifts: Shift[] }) {
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000)),
    [weekStart],
  );
  const weekEnd = days[6];

  const { data: roster, isLoading } = useRoster({ from: toKey(weekStart), to: toKey(weekEnd) });
  const broadcastMutation = useBroadcastNotification();

  const [cell, setCell] = useState<{ employee: EmployeeOption; date: string } | null>(null);

  const toneForShift = useMemo(() => {
    const map = new Map<string, string>();
    shifts.forEach((s, i) => map.set(s.id, SHIFT_TONES[i % SHIFT_TONES.length]));
    return map;
  }, [shifts]);

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

  const handlePublish = () => {
    broadcastMutation.mutate(
      {
        title: 'Roster published',
        body: `This week's shift roster (week of ${weekLabel}) is live — check your shift in the app.`,
        type: 'shift',
      },
      {
        onSuccess: (result) => pushToast(`Roster published to ${result.count} people`),
        onError: (err) => window.alert(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">Roster · week of {weekLabel}</h2>
          <p className="mt-0.5 text-[11.5px] font-medium text-text-dim">Tap a cell to reassign a shift</p>
        </div>
        <Button onClick={handlePublish} isLoading={broadcastMutation.isPending}>
          Publish roster
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] font-bold tracking-wide text-text-dim uppercase">
              <th className="px-5 py-3 font-bold">Employee</th>
              {days.map((d, i) => (
                <th key={toKey(d)} className="px-2 py-3 text-center font-bold">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="font-mono text-[9.5px] tabular-nums text-text-faint">{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && !roster ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-text-dim">
                  Loading…
                </td>
              </tr>
            ) : !roster || roster.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-text-dim">
                  No employees to roster yet.
                </td>
              </tr>
            ) : (
              roster.map((row) => (
                <tr key={row.employee.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-2.5">
                    <div className="font-semibold text-text">
                      {row.employee.firstName} {row.employee.lastName}
                    </div>
                    <div className="font-mono text-[11px] tabular-nums text-text-dim">{row.employee.employeeCode}</div>
                  </td>
                  {days.map((d) => {
                    const dateKey = toKey(d);
                    const assignment = assignmentFor(row, dateKey);
                    return (
                      <td key={dateKey} className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setCell({
                              employee: {
                                id: row.employee.id,
                                label: `${row.employee.firstName} ${row.employee.lastName} (${row.employee.employeeCode})`,
                              },
                              date: dateKey,
                            })
                          }
                          className={`w-full rounded-lg px-1.5 py-1.5 text-[10.5px] font-extrabold transition-opacity hover:opacity-80 ${
                            assignment
                              ? (toneForShift.get(assignment.shift.id) ?? 'bg-text-dim/10 text-text-dim')
                              : 'bg-card-subtle text-text-faint'
                          }`}
                          title={assignment ? `${assignment.shift.name} (${assignment.shift.startTime}–${assignment.shift.endTime})` : 'Unassigned'}
                        >
                          {assignment ? shiftCode(assignment.shift.name) : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cell && (
        <AssignShiftModal
          shifts={shifts}
          initialEmployee={cell.employee}
          initialDate={cell.date}
          onClose={() => setCell(null)}
        />
      )}
    </Card>
  );
}
