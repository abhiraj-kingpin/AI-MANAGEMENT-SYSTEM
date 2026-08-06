import { Types } from 'mongoose';
import QRImage from 'qrcode';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { signQrToken, verifyQrToken } from '../../shared/utils/tokens';
import { Geofence } from '../geofence/geofence.model';
import { QRCode } from './qrCode.model';
import { type QrCodeWithImageDTO, toQrCodeDTO } from './qr.types';
import type { GenerateQrInput } from './qr.validators';

export const qrService = {
  async generate(input: GenerateQrInput, generatedBy: string): Promise<QrCodeWithImageDTO> {
    const geofence = await Geofence.findOne({ _id: input.geofenceId, isActive: true });
    if (!geofence) {
      throw AppError.badRequest('Office location not found or inactive.', 'GEOFENCE_NOT_FOUND');
    }

    const validForMinutes = input.validForMinutes ?? env.QR_DEFAULT_VALID_MINUTES;
    const { token, expiresAt } = signQrToken(input.geofenceId, validForMinutes);

    const qr = await QRCode.create({
      geofenceId: input.geofenceId,
      token,
      validFrom: new Date(),
      validTo: expiresAt,
      singleUse: input.singleUse ?? false,
      generatedBy,
    });

    const qrImageDataUrl = await QRImage.toDataURL(token);

    return { ...toQrCodeDTO(qr), token, qrImageDataUrl };
  },

  /** The dashboard polls this to display a currently-scannable code, auto-refreshing as codes expire. */
  async getActive(geofenceId: string): Promise<QrCodeWithImageDTO | null> {
    const qr = await QRCode.findOne({
      geofenceId,
      isUsed: false,
      validTo: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!qr) return null;

    const qrImageDataUrl = await QRImage.toDataURL(qr.token);
    return { ...toQrCodeDTO(qr), token: qr.token, qrImageDataUrl };
  },

  async revoke(id: string): Promise<void> {
    const qr = await QRCode.findById(id);
    if (!qr) {
      throw AppError.notFound('QR code not found.');
    }
    qr.validTo = new Date(); // immediately expires it — DB is the authority `validateAndConsumeQrToken` re-checks
    await qr.save();
  },
};

/**
 * Used by attendance.service.ts's `checkIn` for `method: 'qr'`. Signature +
 * `exp` verified first (fast-fails obviously bogus/tampered tokens before a
 * DB round trip); `validTo` is re-checked against the DB record specifically
 * because `revoke()` can invalidate a token *before* its baked-in JWT `exp`
 * — the JWT alone wouldn't catch that. See
 * docs/architecture/08-sequence-diagrams.md#2-qr-attendance for the "prevent
 * expired/duplicate/fake QR" requirements this satisfies.
 */
export async function validateAndConsumeQrToken(
  rawToken: string,
  employeeId: string,
): Promise<{ geofenceId: string; qrCodeId: string }> {
  try {
    verifyQrToken(rawToken);
  } catch {
    throw AppError.unauthorized('This QR code is invalid.', 'QR_INVALID');
  }

  const qr = await QRCode.findOne({ token: rawToken });
  if (!qr) {
    throw AppError.unauthorized('This QR code is invalid.', 'QR_INVALID');
  }
  if (qr.validTo.getTime() <= Date.now()) {
    throw AppError.unprocessable('This QR code has expired.', 'QR_EXPIRED');
  }
  if (qr.singleUse && qr.isUsed) {
    throw AppError.conflict('This QR code has already been used.', 'QR_ALREADY_USED');
  }

  qr.usedBy.push({ employeeId: new Types.ObjectId(employeeId), usedAt: new Date() });
  if (qr.singleUse) qr.isUsed = true;
  await qr.save();

  return { geofenceId: String(qr.geofenceId), qrCodeId: qr.id as string };
}
