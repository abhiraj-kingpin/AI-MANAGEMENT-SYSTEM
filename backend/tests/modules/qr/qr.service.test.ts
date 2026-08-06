import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — models mocked, no live database. Same approach
// as every other *.service.test.ts in this suite.
jest.mock('../../../src/modules/qr/qrCode.model', () => ({
  QRCode: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/modules/geofence/geofence.model', () => ({
  Geofence: { findOne: jest.fn() },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fake'),
}));

import { Geofence } from '../../../src/modules/geofence/geofence.model';
import { QRCode } from '../../../src/modules/qr/qrCode.model';
import { qrService, validateAndConsumeQrToken } from '../../../src/modules/qr/qr.service';
import { signQrToken } from '../../../src/shared/utils/tokens';

const mockedQrCreate = QRCode.create as unknown as jest.Mock;
const mockedQrFindOne = QRCode.findOne as unknown as jest.Mock;
const mockedQrFindById = QRCode.findById as unknown as jest.Mock;
const mockedGeofenceFindOne = Geofence.findOne as unknown as jest.Mock;

const employeeId = '507f1f77bcf86cd799439011';

function fakeQr(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qr-1',
    geofenceId: 'geo-1',
    token: 'placeholder',
    validTo: new Date(Date.now() + 60_000),
    singleUse: false,
    isUsed: false,
    usedBy: [] as unknown[],
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('qrService.generate', () => {
  it('signs a token, persists the QRCode, and returns a scannable image', async () => {
    mockedGeofenceFindOne.mockReturnValue(mockQuery({ id: 'geo-1', isActive: true }));
    mockedQrCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'qr-1', createdAt: new Date(), ...data }),
    );

    const result = await qrService.generate({ geofenceId: 'geo-1', validForMinutes: 5 }, 'user-1');

    expect(result.token).toEqual(expect.any(String));
    expect(result.qrImageDataUrl).toBe('data:image/png;base64,fake');
    expect(mockedQrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ geofenceId: 'geo-1', generatedBy: 'user-1', singleUse: false }),
    );
  });

  it('rejects an unknown or inactive office location', async () => {
    mockedGeofenceFindOne.mockReturnValue(mockQuery(null));
    await expect(qrService.generate({ geofenceId: 'ghost' }, 'user-1')).rejects.toMatchObject({
      code: 'GEOFENCE_NOT_FOUND',
    });
  });
});

describe('qrService.getActive', () => {
  it('returns null when there is no currently-valid code for the branch', async () => {
    mockedQrFindOne.mockReturnValue(mockQuery(null));
    expect(await qrService.getActive('geo-1')).toBeNull();
  });
});

describe('qrService.revoke', () => {
  it('sets validTo to now rather than deleting the record', async () => {
    const fake = fakeQr();
    const before = fake.validTo.getTime();
    mockedQrFindById.mockReturnValue(mockQuery(fake));

    await qrService.revoke('qr-1');

    expect(fake.validTo.getTime()).toBeLessThan(before);
    expect(fake.save).toHaveBeenCalledTimes(1);
  });

  it('404s for a missing QR code', async () => {
    mockedQrFindById.mockReturnValue(mockQuery(null));
    await expect(qrService.revoke('ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('validateAndConsumeQrToken', () => {
  it('accepts a valid, unexpired multi-use token and records usage without flipping isUsed', async () => {
    const { token } = signQrToken('geo-1', 5);
    const fake = fakeQr({ token });
    mockedQrFindOne.mockReturnValue(mockQuery(fake));

    const result = await validateAndConsumeQrToken(token, employeeId);

    expect(result).toEqual({ geofenceId: 'geo-1', qrCodeId: 'qr-1' });
    expect(fake.usedBy).toHaveLength(1);
    expect(fake.isUsed).toBe(false);
  });

  it('marks isUsed=true after a single-use token is consumed', async () => {
    const { token } = signQrToken('geo-1', 5);
    const fake = fakeQr({ token, singleUse: true });
    mockedQrFindOne.mockReturnValue(mockQuery(fake));

    await validateAndConsumeQrToken(token, employeeId);

    expect(fake.isUsed).toBe(true);
  });

  it('rejects a token with a bad/forged signature before ever querying the database', async () => {
    await expect(validateAndConsumeQrToken('not-a-real-jwt', employeeId)).rejects.toMatchObject({
      code: 'QR_INVALID',
    });
    expect(mockedQrFindOne).not.toHaveBeenCalled();
  });

  it('rejects a validly-signed token that no longer exists in the database', async () => {
    const { token } = signQrToken('geo-1', 5);
    mockedQrFindOne.mockReturnValue(mockQuery(null));

    await expect(validateAndConsumeQrToken(token, employeeId)).rejects.toMatchObject({
      code: 'QR_INVALID',
    });
  });

  it("rejects when the DB record's validTo has passed — catches an early revoke the JWT's own exp wouldn't", async () => {
    const { token } = signQrToken('geo-1', 5);
    const fake = fakeQr({ token, validTo: new Date(Date.now() - 1000) });
    mockedQrFindOne.mockReturnValue(mockQuery(fake));

    await expect(validateAndConsumeQrToken(token, employeeId)).rejects.toMatchObject({
      code: 'QR_EXPIRED',
    });
  });

  it('rejects reuse of an already-used single-use token', async () => {
    const { token } = signQrToken('geo-1', 5);
    const fake = fakeQr({ token, singleUse: true, isUsed: true });
    mockedQrFindOne.mockReturnValue(mockQuery(fake));

    await expect(validateAndConsumeQrToken(token, employeeId)).rejects.toMatchObject({
      code: 'QR_ALREADY_USED',
    });
  });
});
