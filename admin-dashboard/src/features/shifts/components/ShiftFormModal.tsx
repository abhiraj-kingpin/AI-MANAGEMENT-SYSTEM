import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useCreateShift, useUpdateShift } from '@/features/shifts/hooks/useShiftMutations';
import type { Shift, ShiftType } from '@/types/api';

const SHIFT_TYPES: ShiftType[] = ['morning', 'night', 'rotational', 'flexible'];

/** `POST /shifts` / `PATCH /shifts/:id` — one form for both, same as EmployeeFormPage's create/edit split, just as a modal since a shift definition has far fewer fields. */
export function ShiftFormModal({ shift, onClose }: { shift?: Shift; onClose: () => void }) {
  const [name, setName] = useState(shift?.name ?? '');
  const [type, setType] = useState<ShiftType>(shift?.type ?? 'morning');
  const [startTime, setStartTime] = useState(shift?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '18:00');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    String(shift?.gracePeriodMinutes ?? 10),
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateShift();
  const updateMutation = useUpdateShift();
  const mutation = shift ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = {
      name,
      type,
      startTime,
      endTime,
      gracePeriodMinutes: Number(gracePeriodMinutes),
    };
    const onSettled = {
      onSuccess: onClose,
      onError: (err: unknown) => setError(apiErrorMessage(err)),
    };
    if (shift) {
      updateMutation.mutate({ id: shift.id, input }, onSettled);
    } else {
      createMutation.mutate(input, onSettled);
    }
  };

  return (
    <Modal title={shift ? 'Edit Shift' : 'New Shift'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="shiftName">
          <Input
            id="shiftName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. General Shift"
          />
        </Field>
        <Field label="Type" htmlFor="shiftType">
          <Select
            id="shiftType"
            value={type}
            onChange={(e) => setType(e.target.value as ShiftType)}
          >
            {SHIFT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Time" htmlFor="shiftStart">
            <Input
              id="shiftStart"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="End Time" htmlFor="shiftEnd">
            <Input
              id="shiftEnd"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Grace Period (minutes)" htmlFor="shiftGrace">
          <Input
            id="shiftGrace"
            type="number"
            min={0}
            required
            value={gracePeriodMinutes}
            onChange={(e) => setGracePeriodMinutes(e.target.value)}
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            {shift ? 'Save Changes' : 'Create Shift'}
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
