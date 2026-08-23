import { Error as MongooseError, Types } from 'mongoose';
import { Attendance } from '../../src/modules/attendance/attendance.model';

function baseDoc(overrides: Record<string, unknown> = {}) {
  return new Attendance({
    employeeId: new Types.ObjectId(),
    date: new Date('2026-08-04'),
    method: 'gps',
    checkInAt: new Date('2026-08-04T09:00:00Z'),
    checkInLocation: { lat: 12.9716, lng: 77.5946, accuracyMeters: 8 },
    ...overrides,
  });
}

async function getValidationError(
  doc: InstanceType<typeof Attendance>,
): Promise<MongooseError.ValidationError | null> {
  try {
    await doc.validate();
    return null;
  } catch (err) {
    return err as MongooseError.ValidationError;
  }
}

describe('Attendance model validation', () => {
  it('accepts a valid GPS check-in', async () => {
    expect(await getValidationError(baseDoc())).toBeNull();
  });

  it('rejects checkOutAt before checkInAt', async () => {
    const error = await getValidationError(
      baseDoc({ checkOutAt: new Date('2026-08-04T08:00:00Z') }),
    );
    expect(error?.errors.checkOutAt).toBeDefined();
  });

  it('rejects a GPS check-in with no location', async () => {
    const error = await getValidationError(baseDoc({ checkInLocation: undefined }));
    expect(error?.errors.checkInLocation).toBeDefined();
  });

  it('rejects a QR check-in with no qrCodeId', async () => {
    const error = await getValidationError(baseDoc({ method: 'qr', checkInLocation: undefined }));
    expect(error?.errors.qrCodeId).toBeDefined();
  });

  it('accepts a QR check-in that does carry a qrCodeId', async () => {
    const error = await getValidationError(
      baseDoc({ method: 'qr', checkInLocation: undefined, qrCodeId: new Types.ObjectId() }),
    );
    expect(error).toBeNull();
  });

  it('rejects a face check-in with no confidence score', async () => {
    const error = await getValidationError(baseDoc({ method: 'face', checkInLocation: undefined }));
    expect(error?.errors.faceMatchConfidence).toBeDefined();
  });

  it('declares the unique {employeeId, date} compound index', () => {
    const indexes = Attendance.schema.indexes();
    const hasCompoundUniqueIndex = indexes.some(
      ([fields, options]) =>
        fields.employeeId === 1 && fields.date === 1 && options?.unique === true,
    );
    expect(hasCompoundUniqueIndex).toBe(true);
  });

  it('declares clientGeneratedId as a sparse unique index (offline-sync idempotency)', () => {
    const indexes = Attendance.schema.indexes();
    const hasSparseUniqueIndex = indexes.some(
      ([fields, options]) =>
        fields.clientGeneratedId === 1 && options?.unique === true && options?.sparse === true,
    );
    expect(hasSparseUniqueIndex).toBe(true);
  });
});

describe('Attendance.correctionRequest validation', () => {
  it('accepts a well-formed pending correction request', async () => {
    const error = await getValidationError(
      baseDoc({
        correctionRequest: {
          requestedCheckInAt: new Date('2026-08-04T09:00:00Z'),
          reason: 'Forgot to punch in',
          requestedBy: new Types.ObjectId(),
          requestedAt: new Date(),
        },
      }),
    );
    expect(error).toBeNull();
  });

  it('rejects a correction request with no reason', async () => {
    const error = await getValidationError(
      baseDoc({
        correctionRequest: {
          requestedCheckInAt: new Date('2026-08-04T09:00:00Z'),
          requestedBy: new Types.ObjectId(),
          requestedAt: new Date(),
        },
      }),
    );
    expect(error?.errors['correctionRequest.reason']).toBeDefined();
  });

  it('rejects a correction request with no requestedBy', async () => {
    const error = await getValidationError(
      baseDoc({
        correctionRequest: {
          requestedCheckInAt: new Date('2026-08-04T09:00:00Z'),
          reason: 'Forgot to punch in',
          requestedAt: new Date(),
        },
      }),
    );
    expect(error?.errors['correctionRequest.requestedBy']).toBeDefined();
  });

  it('rejects a correction status outside the enum', async () => {
    const error = await getValidationError(
      baseDoc({
        correctionRequest: {
          reason: 'x',
          requestedBy: new Types.ObjectId(),
          requestedAt: new Date(),
          status: 'archived',
        },
      }),
    );
    expect(error?.errors['correctionRequest.status']).toBeDefined();
  });
});
