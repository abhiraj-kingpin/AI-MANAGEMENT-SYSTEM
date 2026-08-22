import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { useLeaveTypes } from '@/features/leaveTypes/hooks/useLeaveTypes';
import { useApplyLeave } from '@/features/leaves/hooks/useLeaveMutations';
import { apiErrorMessage } from '@/shared/lib/apiError';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ApplyLeaveModal({ onClose }: { onClose: () => void }) {
  const { data: leaveTypes } = useLeaveTypes();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useApplyLeave();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      { leaveTypeId, startDate, endDate, reason },
      {
        onSuccess: onClose,
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Apply for Leave" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Leave Type" htmlFor="applyLeaveType">
          <Select
            id="applyLeaveType"
            required
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
          >
            <option value="" disabled>
              Select a leave type…
            </option>
            {leaveTypes?.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start Date" htmlFor="applyStartDate">
          <Input
            id="applyStartDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="End Date" htmlFor="applyEndDate">
          <Input
            id="applyEndDate"
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
        <Field label="Reason" htmlFor="applyReason">
          <Input
            id="applyReason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Family function out of town"
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending} disabled={!leaveTypeId}>
            Submit Request
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
