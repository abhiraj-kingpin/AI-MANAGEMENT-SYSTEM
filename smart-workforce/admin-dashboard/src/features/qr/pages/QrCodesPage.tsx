import { useState } from 'react';
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

export function QrCodesPage() {
  const { data: geofences } = useGeofences();
  const [geofenceId, setGeofenceId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: activeQr, isLoading } = useActiveQr(geofenceId);
  const revokeMutation = useRevokeQr();
  const selectedGeofence = geofences?.find((g) => g.id === geofenceId);

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
        <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.14em] text-accent-light uppercase">
          Configuration
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">QR Attendance</h1>
        <p className="mt-1 text-[12.5px] font-medium text-text-dim">
          Signed, time-boxed codes for office check-in
        </p>
      </Reveal>

      <Reveal index={1}>
        <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="text-[12.5px] font-bold text-text-dim">Office</span>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
            {/* Ink panel — the signed code itself, styled after the QR
                Attendance console's dark "Generate QR" panel. */}
            <div className="bg-ink flex flex-col gap-4 rounded-card p-5">
              <div>
                <h2 className="text-[15px] font-extrabold text-white">Generate QR</h2>
                <p className="mt-0.5 text-[11.5px] font-medium text-white/50">
                  {selectedGeofence?.branchName ?? 'Signed and time-boxed per office'}
                </p>
              </div>

              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white/[0.06]">
                {isLoading ? (
                  <p className="text-[12.5px] text-white/50">Loading…</p>
                ) : activeQr ? (
                  <img
                    src={activeQr.qrImageDataUrl}
                    alt="Check-in QR code"
                    className="h-full w-full bg-white p-3"
                  />
                ) : (
                  <p className="px-6 text-center font-mono text-[11px] leading-relaxed text-white/40">
                    No active code
                    <br />
                    for this office
                  </p>
                )}
              </div>

              {activeQr && (
                <div className="flex flex-col gap-2.5">
                  <QrRow label="Status" value={activeQr.isUsed ? 'Used' : 'Active'} />
                  {activeQr.singleUse && <QrRow label="Mode" value="Single use" />}
                  <QrRow
                    label="Validity"
                    value={`${formatTime(activeQr.validFrom)} – ${formatTime(activeQr.validTo)}`}
                  />
                </div>
              )}

              {activeQr ? (
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={revokeMutation.isPending}
                  className="rounded-2xl bg-white/[0.1] py-3 text-center text-[13px] font-bold text-white transition-colors hover:bg-white/[0.16] disabled:opacity-50"
                >
                  {revokeMutation.isPending ? 'Revoking…' : 'Revoke code'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsGenerating(true)}
                  className="brand-gradient rounded-2xl py-3 text-center text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(106,76,240,0.55)]"
                >
                  Generate QR Code
                </button>
              )}
            </div>

            {/* Lifecycle summary — this office's current code only; the API
                doesn't expose a full rotation history to list further back. */}
            <Card className="flex flex-col p-5">
              <h2 className="text-[15px] font-extrabold">Code lifecycle</h2>
              <p className="mt-0.5 mb-4 text-[11.5px] font-medium text-text-dim">
                One active code per office at a time
              </p>

              {isLoading ? (
                <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
              ) : !activeQr ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                  <span className="text-2xl" aria-hidden="true">
                    ▦
                  </span>
                  <p className="text-sm text-text-dim">
                    No active QR code for this location yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  <LifecycleRow label="Office" value={selectedGeofence?.branchName ?? '—'} />
                  <LifecycleRow label="Issued" value={formatTime(activeQr.validFrom)} />
                  <LifecycleRow label="Expires" value={formatTime(activeQr.validTo)} />
                  <LifecycleRow
                    label="Mode"
                    value={activeQr.singleUse ? 'Single use' : 'Multi-scan'}
                  />
                  <div className="flex items-center justify-between py-3 text-[13px]">
                    <span className="font-semibold text-text-dim">State</span>
                    <Chip tone={activeQr.isUsed ? 'neutral' : 'success'}>
                      {activeQr.isUsed ? 'Used' : 'Active'}
                    </Chip>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Reveal>
      )}

      {isGenerating && geofenceId && (
        <GenerateQrModal geofenceId={geofenceId} onClose={() => setIsGenerating(false)} />
      )}
    </div>
  );
}

function QrRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.07] px-3.5 py-2.5">
      <span className="text-[11.5px] font-semibold text-white/60">{label}</span>
      <span className="font-mono text-[12px] text-white">{value}</span>
    </div>
  );
}

function LifecycleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-[13px]">
      <span className="font-semibold text-text-dim">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
