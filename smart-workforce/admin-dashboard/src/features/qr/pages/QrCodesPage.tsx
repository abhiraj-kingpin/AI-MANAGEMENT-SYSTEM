import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Field';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import { GenerateQrModal } from '@/features/qr/components/GenerateQrModal';
import { useActiveQr, useRecentQrCodes } from '@/features/qr/hooks/useQr';
import { useRevokeQr } from '@/features/qr/hooks/useQrMutations';
import type { QrCodeState } from '@/types/api';

const STATE_LABEL: Record<QrCodeState, string> = { active: 'Active', expired: 'Expired', revoked: 'Revoked' };
const STATE_TONE: Record<QrCodeState, 'success' | 'neutral' | 'warning'> = {
  active: 'success',
  expired: 'neutral',
  revoked: 'warning',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function QrCodesPage() {
  const { data: geofences } = useGeofences();
  const [geofenceId, setGeofenceId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: activeQr, isLoading } = useActiveQr(geofenceId);
  const { data: recentCodes, isLoading: recentLoading } = useRecentQrCodes();
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
          System
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
              {!geofenceId ? (
                <p className="px-6 text-center font-mono text-[11px] leading-relaxed text-white/40">
                  Select an office above
                  <br />
                  to generate a code
                </p>
              ) : isLoading ? (
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

            <div className="flex flex-col gap-2.5">
              {activeQr && (
                <>
                  <QrRow label="Status" value={activeQr.isUsed ? 'Used' : 'Active'} />
                  {activeQr.singleUse && <QrRow label="Mode" value="Single use" />}
                  <QrRow
                    label="Validity"
                    value={`${formatTime(activeQr.validFrom)} – ${formatTime(activeQr.validTo)}`}
                  />
                </>
              )}
              {/* jsonwebtoken's default signing algorithm — see signQrToken
                  in shared/utils/tokens.ts, no explicit algorithm override. */}
              <QrRow label="Signing algorithm" value="HS256" />
            </div>

            {geofenceId &&
              (activeQr ? (
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
                  Generate QR code
                </button>
              ))}
          </div>

          {/* Every office's recent codes, not just the selected one's —
              GET /qr/recent, newest first. */}
          <Card className="flex flex-col overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-extrabold">Code lifecycle</h2>
              <p className="mt-0.5 text-[11.5px] font-medium text-text-dim">Rotates every 15 minutes, across every office</p>
            </div>
            {recentLoading && !recentCodes ? (
              <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
            ) : !recentCodes || recentCodes.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="text-2xl" aria-hidden="true">
                  ▦
                </span>
                <p className="text-sm text-text-dim">No QR codes generated yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3 font-bold">Code</th>
                      <th className="px-5 py-3 font-bold">Office</th>
                      <th className="px-5 py-3 font-bold">Issued</th>
                      <th className="px-5 py-3 font-bold">Scans</th>
                      <th className="px-5 py-3 text-right font-bold">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCodes.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-2.5 font-mono text-[12px] tabular-nums font-semibold">{row.code}</td>
                        <td className="px-5 py-2.5 text-text-dim">{row.office}</td>
                        <td className="px-5 py-2.5 font-mono text-[12px] tabular-nums text-text-dim">{formatTime(row.issued)}</td>
                        <td className="px-5 py-2.5 font-mono text-[12px] tabular-nums">{row.scans}</td>
                        <td className="px-5 py-2.5 text-right">
                          <Chip tone={STATE_TONE[row.state]}>{STATE_LABEL[row.state]}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </Reveal>

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
