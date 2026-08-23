import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { useCorrectAttendance } from '@/features/attendance/hooks/useAttendanceMutations';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { Attendance, AttendanceStatus } from '@/types/api';

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'late', 'half_day', 'absent', 'on_leave'];

export function CorrectionModal({
  attendance,
  onClose,
}: {
  attendance: Attendance;
  onClose: () => void;
}) {
  const [checkInAt, setCheckInAt] = useState(attendance.checkInAt?.slice(0, 16) ?? '');
  const [checkOutAt, setCheckOutAt] = useState(attendance.checkOutAt?.slice(0, 16) ?? '');
  const [status, setStatus] = useState<AttendanceStatus>(attendance.status);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useCorrectAttendance();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      {
        id: attendance.id,
        input: {
          checkInAt: checkInAt ? new Date(checkInAt).toISOString() : undefined,
          checkOutAt: checkOutAt ? new Date(checkOutAt).toISOString() : undefined,
          status,
          reason,
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Correct Attendance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Check In" htmlFor="correctCheckIn">
          <Input
            id="correctCheckIn"
            type="datetime-local"
            value={checkInAt}
            onChange={(e) => setCheckInAt(e.target.value)}
          />
        </Field>
        <Field label="Check Out" htmlFor="correctCheckOut">
          <Input
            id="correctCheckOut"
            type="datetime-local"
            value={checkOutAt}
            onChange={(e) => setCheckOutAt(e.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="correctStatus">
          <Select
            id="correctStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason (required, audit-logged)" htmlFor="correctReason">
          <Input
            id="correctReason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Forgot to check out, confirmed with employee"
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            Save Correction
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
