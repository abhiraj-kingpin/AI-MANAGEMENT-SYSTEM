import { Types } from 'mongoose';
import { QRCode } from '../../src/modules/qr/qrCode.model';

describe('QRCode model validation', () => {
  it('accepts a well-formed QR token document', () => {
    const qr = new QRCode({
      geofenceId: new Types.ObjectId(),
      token: 'signed.token.value',
      validFrom: new Date('2026-08-04T09:00:00Z'),
      validTo: new Date('2026-08-04T09:05:00Z'),
      generatedBy: new Types.ObjectId(),
    });

    expect(qr.validateSync()).toBeUndefined();
    expect(qr.singleUse).toBe(false);
    expect(qr.isUsed).toBe(false);
  });

  it('rejects validTo at or before validFrom (closes the replay window)', () => {
    const qr = new QRCode({
      geofenceId: new Types.ObjectId(),
      token: 'signed.token.value',
      validFrom: new Date('2026-08-04T09:05:00Z'),
      validTo: new Date('2026-08-04T09:00:00Z'),
      generatedBy: new Types.ObjectId(),
    });

    const error = qr.validateSync();
    expect(error?.errors.validTo).toBeDefined();
  });

  it('requires geofenceId and generatedBy', () => {
    const qr = new QRCode({
      token: 'signed.token.value',
      validFrom: new Date('2026-08-04T09:00:00Z'),
      validTo: new Date('2026-08-04T09:05:00Z'),
    });

    const error = qr.validateSync();
    expect(error?.errors.geofenceId).toBeDefined();
    expect(error?.errors.generatedBy).toBeDefined();
  });
});
