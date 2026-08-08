import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import { GenerateQrModal } from '@/features/qr/components/GenerateQrModal';
import { useActiveQr } from '@/features/qr/hooks/useQr';
import { useRevokeQr } from '@/features/qr/hooks/useQrMutations';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Super Admin/HR only — same reasoning as GeofencesPage. A QR code is always scoped to one office location, so this screen starts with a geofence picker rather than a flat list. */
export function QrCodesPage() {
  const { data: geofences } = useGeofences();
  const [geofenceId, setGeofenceId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: activeQr, isLoading } = useActiveQr(geofenceId);
  const revokeMutation = useRevokeQr();

  const handleRevoke = () => {
    if (!activeQr) return;
    if (!window.confirm('Revoke this QR code? Anyone who hasn’t scanned it yet no longer can.'))
      return;
    revokeMutation.mutate(activeQr.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Configuration
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">QR Codes</h1>
      </Reveal>

      <Reveal index={1}>
        <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Select
            value={geofenceId ?? ''}
            onChange={(e) => setGeofenceId(e.target.value || null)}
            className="w-auto min-w-[220px]"
          >
            <option value="">Select an office location…</option>
            {geofences
              ?.filter((g) => g.isActive)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.branchName}
                </option>
              ))}
          </Select>
        </Card>
      </Reveal>

      {geofenceId && (
        <Reveal index={2}>
          <Card className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            {isLoading ? (
              <p className="text-sm text-text-dim">Loading…</p>
            ) : activeQr ? (
              <>
                <img
                  src={activeQr.qrImageDataUrl}
                  alt="Check-in QR code"
                  className="h-48 w-48 rounded-xl bg-white p-3"
                />
                <div className="flex items-center gap-2">
                  <Chip tone={activeQr.isUsed ? 'neutral' : 'success'}>
                    {activeQr.isUsed ? 'Used' : 'Active'}
                  </Chip>
                  {activeQr.singleUse && <Chip tone="warning">Single use</Chip>}
                </div>
                <p className="text-[13px] text-text-dim">
                  Valid {formatTime(activeQr.validFrom)} – {formatTime(activeQr.validTo)}
                </p>
                <Button variant="ghost" onClick={handleRevoke} isLoading={revokeMutation.isPending}>
                  Revoke
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-text-dim">No active QR code for this location.</p>
                <Button onClick={() => setIsGenerating(true)}>Generate QR Code</Button>
              </>
            )}
          </Card>
        </Reveal>
      )}

      {isGenerating && geofenceId && (
        <GenerateQrModal geofenceId={geofenceId} onClose={() => setIsGenerating(false)} />
      )}
    </div>
  );
}
