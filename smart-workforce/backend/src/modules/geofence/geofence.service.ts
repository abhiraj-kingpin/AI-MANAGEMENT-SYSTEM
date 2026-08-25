import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { round2 } from '../../shared/utils/math';
import { Attendance } from '../attendance/attendance.model';
import { recordAudit } from '../audit/audit.service';
import { Employee } from '../employees/employee.model';
import { Geofence } from './geofence.model';
import {
  type GeofenceDTO,
  type NearestGeofenceResult,
  type OfficeSummaryDTO,
  toGeofenceDTO,
} from './geofence.types';
import type { CreateGeofenceInput, UpdateGeofenceInput } from './geofence.validators';

const PRESENT_STATUSES = new Set(['present', 'late', 'half_day']);

interface GeofenceAggregateResult {
  _id: unknown;
  branchName: string;
  center: { coordinates: [number, number] };
  radiusMeters: number;
  isActive: boolean;
  type: GeofenceDTO['type'];
  parentId: unknown;
  capacity: number | null;
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
    type: doc.type ?? 'building',
    parentId: doc.parentId ? String(doc.parentId) : null,
    capacity: doc.capacity ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Only buildings carry a check-in geofence of their own — floors/rooms
// share their building's exact center/radius (see createGeofence), so
// including them here would just return duplicate matches at the same
// coordinates under a room's name instead of the building's.
async function geoNearActiveGeofences(lat: number, lng: number, limit?: number) {
  return Geofence.aggregate<GeofenceAggregateResult>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical: true,
        query: { isActive: true, type: 'building' },
      },
    },
    ...(limit ? [{ $limit: limit }] : []),
  ]);
}

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
  async createGeofence(input: CreateGeofenceInput, actor: ActorContext): Promise<GeofenceDTO> {
    let center = input.center;
    let radiusMeters = input.radiusMeters ?? 150;

    if (input.type !== 'building' && input.parentId) {
      // Floors and rooms inherit their building's geofence — they're the
      // same physical footprint for GPS matching, just a finer label for
      // capacity/roster purposes.
      const parent = await Geofence.findById(input.parentId);
      if (!parent) {
        throw AppError.badRequest('Parent building not found.', 'PARENT_NOT_FOUND');
      }
      const [lng, lat] = parent.center.coordinates;
      center = center ?? { lat, lng };
      radiusMeters = input.radiusMeters ?? parent.radiusMeters;
    }

    if (!center) {
      throw AppError.badRequest('A center point is required.', 'CENTER_REQUIRED');
    }

    const geofence = await Geofence.create({
      branchName: input.branchName,
      center: { type: 'Point', coordinates: [center.lng, center.lat] },
      radiusMeters,
      type: input.type,
      parentId: input.type === 'building' ? null : input.parentId,
      capacity: input.capacity ?? null,
    });

    await recordAudit({
      actorId: actor.id,
      action: `geofence.${input.type}.create`,
      entityType: 'Geofence',
      entityId: geofence.id as string,
      before: null,
      after: { branchName: input.branchName, type: input.type, parentId: input.parentId ?? null },
    });

    return toGeofenceDTO(geofence);
  },

  async listGeofences(includeInactive: boolean): Promise<GeofenceDTO[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const geofences = await Geofence.find(filter).sort({ branchName: 1 });
    return geofences.map(toGeofenceDTO);
  },

  // One row per building — how many employees list it as their primary
  // site, and what share of them are accounted-for present today.
  async officeStats(): Promise<OfficeSummaryDTO[]> {
    const buildings = await Geofence.find({ type: 'building' }).select('_id');
    const today = startOfUtcDay(new Date());

    return Promise.all(
      buildings.map(async (building) => {
        const officeId = String(building._id);
        const assignedEmployees = await Employee.find({
          primaryOfficeId: officeId,
          isDeleted: false,
        }).select('_id');
        const assigned = assignedEmployees.length;
        if (assigned === 0) {
          return { officeId, assigned: 0, attendanceRate: 0 };
        }

        const records = await Attendance.find({
          employeeId: { $in: assignedEmployees.map((e) => e._id) },
          date: today,
        }).select('status');
        const presentCount = records.filter((r) => PRESENT_STATUSES.has(r.status)).length;

        return { officeId, assigned, attendanceRate: round2((presentCount / assigned) * 100) };
      }),
    );
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
    if (updates.capacity !== undefined) geofence.capacity = updates.capacity;
    if (updates.isActive !== undefined) geofence.isActive = updates.isActive;

    await geofence.save();
    return toGeofenceDTO(geofence);
  },

  async deactivateGeofence(id: string): Promise<void> {
    const geofence = await Geofence.findById(id);
    if (!geofence) {
      throw AppError.notFound('Office location not found.');
    }
    geofence.isActive = false;
    await geofence.save();
  },

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
