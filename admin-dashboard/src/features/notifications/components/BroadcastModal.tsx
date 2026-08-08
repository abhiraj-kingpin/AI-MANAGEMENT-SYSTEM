import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useBroadcastNotification } from '@/features/notifications/hooks/useNotificationMutations';
import type { NotificationType } from '@/types/api';

/** `POST /notifications/broadcast` — `recipientId: null` on the server side (a real send to everyone or one department, not a targeted notification per employee). Super Admin/HR only. */
export function BroadcastModal({ onClose }: { onClose: () => void }) {
  const { data: departments } = useDepartments();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<NotificationType>('announcement');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const mutation = useBroadcastNotification();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      { title, body, type, departmentId: departmentId || undefined },
      {
        onSuccess: (result) => setSentCount(result.count),
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  if (sentCount !== null) {
    return (
      <Modal title="Broadcast Sent" onClose={onClose}>
        <p className="text-sm text-text-dim">
          Delivered to {sentCount} employee{sentCount === 1 ? '' : 's'}.
        </p>
        <Button variant="ghost" onClick={onClose} className="mt-4">
          Close
        </Button>
      </Modal>
    );
  }

  return (
    <Modal title="Send Broadcast" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" htmlFor="broadcastTitle">
          <Input
            id="broadcastTitle"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Office closed Friday"
          />
        </Field>
        <Field label="Message" htmlFor="broadcastBody">
          <Input
            id="broadcastBody"
            required
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. The office will be closed for a public holiday."
          />
        </Field>
        <Field label="Type" htmlFor="broadcastType">
          <Select
            id="broadcastType"
            value={type}
            onChange={(e) => setType(e.target.value as NotificationType)}
          >
            <option value="announcement">Announcement</option>
            <option value="holiday">Holiday</option>
          </Select>
        </Field>
        <Field label="Department (optional)" htmlFor="broadcastDepartment">
          <Select
            id="broadcastDepartment"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Everyone</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            Send
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
