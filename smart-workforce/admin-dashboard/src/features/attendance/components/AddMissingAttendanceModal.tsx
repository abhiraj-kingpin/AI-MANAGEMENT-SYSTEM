import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { EmployeePicker, type EmployeeOption } from '@/features/employees/components/EmployeePicker';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useCreateManualAttendance } from '@/features/attendance/hooks/useAttendanceMutations';
import { pushToast } from '@/stores/toastStore';
import type { AttendanceStatus } from '@/types/api';

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'late', 'half_day', 'absent', 'on_leave'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddMissingAttendanceModal({ onClose }: { onClose: () => void }) {
  const [employee, setEmployee] = useState<EmployeeOption | null>(null);
  const [date, setDate] = useState(today());
  const [checkInAt, setCheckInAt] = useState('');
  const [checkOutAt, setCheckOutAt] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreateManualAttendance();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employee) {
      setError('Pick an employee.');
      return;
    }
    mutation.mutate(
      {
        employeeId: employee.id,
        date,
        checkInAt: checkInAt ? new Date(`${date}T${checkInAt}`).toISOString() : undefined,
        checkOutAt: checkOutAt ? new Date(`${date}T${checkOutAt}`).toISOString() : undefined,
        status,
        reason,
      },
      {
        onSuccess: () => {
          pushToast(`Attendance added for ${employee.label}`);
          onClose();
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Add missing attendance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Employee" htmlFor="manualEmployee">
          <EmployeePicker value={employee} onChange={setEmployee} />
        </Field>
        <Field label="Date" htmlFor="manualDate">
          <Input id="manualDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check in (optional)" htmlFor="manualIn">
            <Input id="manualIn" type="time" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
          </Field>
          <Field label="Check out (optional)" htmlFor="manualOut">
            <Input id="manualOut" type="time" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Status" htmlFor="manualStatus">
          <Select id="manualStatus" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason (required, audit-logged)" htmlFor="manualReason">
          <Input
            id="manualReason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Device was offline, confirmed with employee's manager"
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            Add record
          </Button>
          <button type="button" onClick={onClose} className="px-4 text-sm text-text-dim hover:text-text">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
