import axios from 'axios';
import { api } from '@/shared/lib/axios';
import type { ApiSuccess, GenerateQrInput, QrCode } from '@/types/api';

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
