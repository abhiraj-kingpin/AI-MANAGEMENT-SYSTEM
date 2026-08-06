import { AppError } from '../../shared/errors/AppError';
import { Geofence } from './geofence.model';
import { type GeofenceDTO, type NearestGeofenceResult, toGeofenceDTO } from './geofence.types';
import type { CreateGeofenceInput, UpdateGeofenceInput } from './geofence.validators';

/** Shape of a raw `$geoNear` aggregation result — plain object, not a hydrated Mongoose document. */
interface GeofenceAggregateResult {
  _id: unknown;
  branchName: string;
  center: { coordinates: [number, number] };
  radiusMeters: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters: number;
}

function toDTOFromAggregate(doc: GeofenceAggregateResult): GeofenceDTO {
  const [lng, lat] = doc.center.coordinates;
  return {
    id: String(doc._id),
    branchName: doc.branchName,
    center: { lat, lng },
    radiusMeters: doc.radiusMeters,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * A single indexed `$geoNear` query (sorted nearest-first, using the
 * `2dsphere` index from Phase 2) replaces an app-level haversine loop
 * across every branch — see docs/architecture/01-software-architecture.md.
 */
async function geoNearActiveGeofences(lat: number, lng: number, limit?: number) {
  return Geofence.aggregate<GeofenceAggregateResult>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical: true,
        query: { isActive: true },
      },
    },
    ...(limit ? [{ $limit: limit }] : []),
  ]);
}

/** Used by attendance.service.ts to validate a GPS check-in. */
export async function findNearestGeofence(
  lat: number,
  lng: number,
): Promise<NearestGeofenceResult | null> {
  const [nearest] = await geoNearActiveGeofences(lat, lng, 1);
  if (!nearest) return null;

  const geofence = toDTOFromAggregate(nearest);
  return {
    geofence,
    distanceMeters: Math.round(nearest.distanceMeters),
    isInside: nearest.distanceMeters <= geofence.radiusMeters,
  };
}

export const geofenceService = {
  async createGeofence(input: CreateGeofenceInput): Promise<GeofenceDTO> {
    const geofence = await Geofence.create({
      branchName: input.branchName,
      center: { type: 'Point', coordinates: [input.center.lng, input.center.lat] },
      radiusMeters: input.radiusMeters,
    });
    return toGeofenceDTO(geofence);
  },

  async listGeofences(includeInactive: boolean): Promise<GeofenceDTO[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const geofences = await Geofence.find(filter).sort({ branchName: 1 });
    return geofences.map(toGeofenceDTO);
  },

  async updateGeofence(id: string, updates: UpdateGeofenceInput): Promise<GeofenceDTO> {
    const geofence = await Geofence.findById(id);
    if (!geofence) {
      throw AppError.notFound('Office location not found.');
    }

    if (updates.branchName !== undefined) geofence.branchName = updates.branchName;
    if (updates.center) {
      geofence.center = { type: 'Point', coordinates: [updates.center.lng, updates.center.lat] };
    }
    if (updates.radiusMeters !== undefined) geofence.radiusMeters = updates.radiusMeters;
    if (updates.isActive !== undefined) geofence.isActive = updates.isActive;

    await geofence.save();
    return toGeofenceDTO(geofence);
  },

  /** DELETE deactivates rather than hard-deletes — historical Attendance.geofenceId refs must stay resolvable. */
  async deactivateGeofence(id: string): Promise<void> {
    const geofence = await Geofence.findById(id);
    if (!geofence) {
      throw AppError.notFound('Office location not found.');
    }
    geofence.isActive = false;
    await geofence.save();
  },

  /** Debug endpoint: every active geofence within reach of a point, nearest first. */
  async nearby(lat: number, lng: number): Promise<NearestGeofenceResult[]> {
    const results = await geoNearActiveGeofences(lat, lng);
    return results.map((doc) => {
      const geofence = toDTOFromAggregate(doc);
      return {
        geofence,
        distanceMeters: Math.round(doc.distanceMeters),
        isInside: doc.distanceMeters <= geofence.radiusMeters,
      };
    });
  },
};
