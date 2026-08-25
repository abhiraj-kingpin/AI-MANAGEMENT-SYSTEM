import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useInviteUser } from '@/features/users/hooks/useUsers';
import { pushToast } from '@/stores/toastStore';
import type { Role } from '@/types/api';

const ROLE_OPTIONS: Array<{ value: Exclude<Role, 'super_admin'>; label: string }> = [
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
];

export function InviteUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'super_admin'>>('hr');
  const [error, setError] = useState<string | null>(null);
  const mutation = useInviteUser();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      { email, role },
      {
        onSuccess: () => {
          pushToast(`Invite sent to ${email}`);
          onClose();
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Invite console user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[12.5px] text-text-dim">
          Grants sign-in access to this console — separate from the employee roster. The
          activation link is sent to their email.
        </p>
        <Field label="Work email" htmlFor="inviteEmail">
          <Input
            id="inviteEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />
        </Field>
        <Field label="Role" htmlFor="inviteRole">
          <Select id="inviteRole" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'super_admin'>)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            Send invite
          </Button>
          <button type="button" onClick={onClose} className="px-4 text-sm text-text-dim hover:text-text">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
