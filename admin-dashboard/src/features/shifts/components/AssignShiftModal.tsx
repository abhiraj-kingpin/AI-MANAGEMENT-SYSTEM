import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import {
  EmployeePicker,
  type EmployeeOption,
} from '@/features/employees/components/EmployeePicker';
import { useAssignShift } from '@/features/shifts/hooks/useShiftMutations';
import type { Shift } from '@/types/api';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `POST /shifts/assign` — one employee at a time. `POST /shifts/assign/bulk`
 * exists on the API (same input, an array of employeeIds) but isn't wired
 * up here yet — a real, deliberate scope cut, not an oversight, to keep
 * pace across the remaining feature areas; single-assign covers the common
 * case (a new hire or a one-off change) today.
 */
export function AssignShiftModal({ shifts, onClose }: { shifts: Shift[]; onClose: () => void }) {
  const [employee, setEmployee] = useState<EmployeeOption | null>(null);
  const [shiftId, setShiftId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [error, setError] = useState<string | null>(null);

  const mutation = useAssignShift();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employee) {
      setError('Select an employee first.');
      return;
    }
    mutation.mutate(
      { employeeId: employee.id, shiftId, effectiveFrom },
      {
        onSuccess: onClose,
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Assign Shift" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Employee" htmlFor="assignEmployee">
          <EmployeePicker value={employee} onChange={setEmployee} />
        </Field>
        <Field label="Shift" htmlFor="assignShift">
          <Select
            id="assignShift"
            required
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
          >
            <option value="" disabled>
              Select a shift…
            </option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Effective From" htmlFor="assignFrom">
          <input
            id="assignFrom"
            type="date"
            required
            min={today()}
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14.5px] text-text focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending} disabled={!shiftId}>
            Assign
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
