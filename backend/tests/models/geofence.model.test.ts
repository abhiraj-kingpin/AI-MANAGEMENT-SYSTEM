import { Geofence } from '../../src/modules/geofence/geofence.model';

describe('Geofence model validation', () => {
  it('accepts a valid [lng, lat] point and defaults the radius', () => {
    const geofence = new Geofence({
      branchName: 'HQ - Bengaluru',
      center: { coordinates: [77.5946, 12.9716] },
    });

    expect(geofence.validateSync()).toBeUndefined();
    expect(geofence.radiusMeters).toBe(150);
    expect(geofence.center.type).toBe('Point');
  });

  it('rejects an out-of-range latitude', () => {
    const geofence = new Geofence({
      branchName: 'Bad Branch',
      center: { coordinates: [77.5946, 123] }, // lat out of [-90, 90]
    });

    const error = geofence.validateSync();
    expect(error?.errors['center.coordinates']).toBeDefined();
  });

  it('rejects coordinates with the wrong arity', () => {
    const geofence = new Geofence({
      branchName: 'Bad Branch',
      center: { coordinates: [77.5946] },
    });

    const error = geofence.validateSync();
    expect(error?.errors['center.coordinates']).toBeDefined();
  });

  it('rejects a radius below the 10m floor', () => {
    const geofence = new Geofence({
      branchName: 'Tiny Branch',
      center: { coordinates: [77.5946, 12.9716] },
      radiusMeters: 5,
    });

    const error = geofence.validateSync();
    expect(error?.errors.radiusMeters).toBeDefined();
  });

  it('declares a 2dsphere index on center for $geoNear/$geoWithin queries', () => {
    const indexes = Geofence.schema.indexes();
    const hasGeoIndex = indexes.some(([fields]) => fields.center === '2dsphere');
    expect(hasGeoIndex).toBe(true);
  });
});
