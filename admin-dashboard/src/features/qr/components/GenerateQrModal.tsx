import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useGenerateQr } from '@/features/qr/hooks/useQrMutations';

export function GenerateQrModal({
  geofenceId,
  onClose,
}: {
  geofenceId: string;
  onClose: () => void;
}) {
  const [validForMinutes, setValidForMinutes] = useState('15');
  const [singleUse, setSingleUse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useGenerateQr();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      { geofenceId, validForMinutes: Number(validForMinutes), singleUse },
      {
        onSuccess: onClose,
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Generate QR Code" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Valid For (minutes, max 60)" htmlFor="qrValidFor">
          <Input
            id="qrValidFor"
            type="number"
            min={1}
            max={60}
            required
            value={validForMinutes}
            onChange={(e) => setValidForMinutes(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-[13.5px] text-text-dim">
          <input
            type="checkbox"
            checked={singleUse}
            onChange={(e) => setSingleUse(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Single use (revokes itself after the first scan)
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            Generate
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
