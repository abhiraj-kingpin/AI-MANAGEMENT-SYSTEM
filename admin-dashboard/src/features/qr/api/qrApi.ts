import axios from 'axios';
import { api } from '@/shared/lib/axios';
import type { ApiSuccess, GenerateQrInput, QrCode } from '@/types/api';

/**
 * `GET /qr/active` 404s with `NO_ACTIVE_QR` when a geofence has no active
 * code right now — a real, expected state (every code is time-boxed to
 * `validForMinutes`), not an error condition. Resolving that 404 to `null`
 * here means callers can treat "no active QR" and "loading" as the only
 * two states, rather than special-casing an error that isn't one.
 */
export async function fetchActiveQr(geofenceId: string): Promise<QrCode | null> {
  try {
    const res = await api.get<ApiSuccess<{ qr: QrCode }>>('/qr/active', {
      params: { geofenceId },
    });
    return res.data.data.qr;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function generateQr(input: GenerateQrInput): Promise<QrCode> {
  const res = await api.post<ApiSuccess<{ qr: QrCode }>>('/qr/generate', input);
  return res.data.data.qr;
}

export async function revokeQr(id: string): Promise<void> {
  await api.post<ApiSuccess<{ status: string }>>(`/qr/${id}/revoke`);
}
