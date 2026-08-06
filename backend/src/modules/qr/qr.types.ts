import type { IQrCode } from './qrCode.model';

export interface QrCodeDTO {
  id: string;
  geofenceId: string;
  validFrom: Date;
  validTo: Date;
  isUsed: boolean;
  singleUse: boolean;
  generatedBy: string;
  createdAt: Date;
}

/** Only returned from `generate`/`active` — the raw token + a scannable image, never from any list-style endpoint. */
export interface QrCodeWithImageDTO extends QrCodeDTO {
  token: string;
  qrImageDataUrl: string;
}

export function toQrCodeDTO(doc: IQrCode): QrCodeDTO {
  return {
    id: doc.id as string,
    geofenceId: String(doc.geofenceId),
    validFrom: doc.validFrom,
    validTo: doc.validTo,
    isUsed: doc.isUsed,
    singleUse: doc.singleUse,
    generatedBy: String(doc.generatedBy),
    createdAt: doc.createdAt,
  };
}
