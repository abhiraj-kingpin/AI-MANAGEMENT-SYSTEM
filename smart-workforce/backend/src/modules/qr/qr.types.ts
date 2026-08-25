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

export type QrCodeState = 'active' | 'expired' | 'revoked';

export interface QrCodeLifecycleRowDTO {
  id: string;
  code: string;
  office: string;
  issued: Date;
  scans: number;
  state: QrCodeState;
}

export function toQrLifecycleRow(
  doc: IQrCode,
  officeName: string,
  scans: number,
): QrCodeLifecycleRowDTO {
  const state: QrCodeState = doc.revokedAt
    ? 'revoked'
    : doc.validTo.getTime() <= Date.now()
      ? 'expired'
      : 'active';
  return {
    id: doc.id as string,
    code: doc.token.slice(-8).toUpperCase(),
    office: officeName,
    issued: doc.validFrom,
    scans,
    state,
  };
}
