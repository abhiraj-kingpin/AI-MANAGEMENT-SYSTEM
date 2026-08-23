import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { qrService } from './qr.service';
import type { ActiveQrQuery } from './qr.validators';

export const generateQr = asyncHandler(async (req, res) => {
  const qr = await qrService.generate(req.body, req.user!.id);
  sendSuccess(res, { qr }, 201);
});

export const activeQr = asyncHandler(async (req, res) => {
  const { geofenceId } = req.validated!.query as ActiveQrQuery;
  const qr = await qrService.getActive(geofenceId);
  if (!qr) {
    throw AppError.notFound('No active QR code for this office location.', 'NO_ACTIVE_QR');
  }
  sendSuccess(res, { qr });
});

export const revokeQr = asyncHandler(async (req, res) => {
  await qrService.revoke(req.params.id);
  sendSuccess(res, { status: 'ok' });
});
