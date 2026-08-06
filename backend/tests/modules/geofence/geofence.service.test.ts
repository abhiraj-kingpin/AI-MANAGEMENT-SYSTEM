import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — Geofence model mocked, no live database. Same
// approach as every other *.service.test.ts in this suite.
jest.mock('../../../src/modules/geofence/geofence.model', () => ({
  Geofence: {
    aggregate: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

import { Geofence } from '../../../src/modules/geofence/geofence.model';
import {
  findNearestGeofence,
  geofenceService,
} from '../../../src/modules/geofence/geofence.service';

const mockedAggregate = Geofence.aggregate as unknown as jest.Mock;
const mockedCreate = Geofence.create as unknown as jest.Mock;
const mockedFindById = Geofence.findById as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function aggregateResult(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'geo-1',
    branchName: 'HQ - Bengaluru',
    center: { coordinates: [77.5946, 12.9716] },
    radiusMeters: 150,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    distanceMeters: 42,
    ...overrides,
  };
}

describe('findNearestGeofence', () => {
  it('reports isInside=true when the point is within the radius', async () => {
    mockedAggregate.mockResolvedValue([aggregateResult({ distanceMeters: 42, radiusMeters: 150 })]);

    const result = await findNearestGeofence(12.9716, 77.5946);

    expect(result?.isInside).toBe(true);
    expect(result?.distanceMeters).toBe(42);
    expect(result?.geofence.branchName).toBe('HQ - Bengaluru');
  });

  it('reports isInside=false when the point is outside the radius', async () => {
    mockedAggregate.mockResolvedValue([
      aggregateResult({ distanceMeters: 420, radiusMeters: 150 }),
    ]);

    const result = await findNearestGeofence(12.9716, 77.5946);

    expect(result?.isInside).toBe(false);
  });

  it('returns null when no active geofence exists', async () => {
    mockedAggregate.mockResolvedValue([]);
    expect(await findNearestGeofence(12.9716, 77.5946)).toBeNull();
  });

  it('queries only active geofences via an indexed $geoNear, nearest first', async () => {
    mockedAggregate.mockResolvedValue([aggregateResult()]);

    await findNearestGeofence(12.9716, 77.5946);

    expect(mockedAggregate).toHaveBeenCalledWith([
      expect.objectContaining({
        $geoNear: expect.objectContaining({
          near: { type: 'Point', coordinates: [77.5946, 12.9716] },
          spherical: true,
          query: { isActive: true },
        }),
      }),
      { $limit: 1 },
    ]);
  });
});

describe('geofenceService.createGeofence', () => {
  it('converts {lat,lng} to GeoJSON [lng,lat] coordinates', async () => {
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'geo-1', createdAt: new Date(), updatedAt: new Date(), ...data }),
    );

    const dto = await geofenceService.createGeofence({
      branchName: 'HQ',
      center: { lat: 12.9716, lng: 77.5946 },
      radiusMeters: 150,
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        center: { type: 'Point', coordinates: [77.5946, 12.9716] },
      }),
    );
    expect(dto.center).toEqual({ lat: 12.9716, lng: 77.5946 });
  });
});

describe('geofenceService.updateGeofence', () => {
  function fakeGeofence(overrides: Record<string, unknown> = {}) {
    return {
      id: 'geo-1',
      branchName: 'HQ',
      center: { type: 'Point', coordinates: [77.5946, 12.9716] },
      radiusMeters: 150,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(function save(this: object) {
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }

  it('updates only the fields provided', async () => {
    const fake = fakeGeofence();
    mockedFindById.mockReturnValue(mockQuery(fake));

    const dto = await geofenceService.updateGeofence('geo-1', { radiusMeters: 200 });

    expect(fake.radiusMeters).toBe(200);
    expect(fake.branchName).toBe('HQ'); // untouched
    expect(dto.radiusMeters).toBe(200);
  });

  it('404s for a missing geofence', async () => {
    mockedFindById.mockReturnValue(mockQuery(null));
    await expect(
      geofenceService.updateGeofence('ghost', { radiusMeters: 200 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('geofenceService.deactivateGeofence', () => {
  it('sets isActive to false rather than deleting the document', async () => {
    const fake = {
      id: 'geo-1',
      isActive: true,
      save: jest.fn(function save(this: object) {
        return Promise.resolve(this);
      }),
    };
    mockedFindById.mockReturnValue(mockQuery(fake));

    await geofenceService.deactivateGeofence('geo-1');

    expect(fake.isActive).toBe(false);
    expect(fake.save).toHaveBeenCalledTimes(1);
  });
});

describe('geofenceService.nearby', () => {
  it("flags each candidate's isInside independently, using its own radius", async () => {
    mockedAggregate.mockResolvedValue([
      aggregateResult({ _id: 'geo-1', distanceMeters: 42, radiusMeters: 150 }),
      aggregateResult({ _id: 'geo-2', distanceMeters: 900, radiusMeters: 150 }),
    ]);

    const results = await geofenceService.nearby(12.9716, 77.5946);

    expect(results[0].isInside).toBe(true);
    expect(results[1].isInside).toBe(false);
  });
});
