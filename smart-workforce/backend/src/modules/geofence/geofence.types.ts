import type { GeofenceType, IGeofence } from './geofence.model';

export interface GeofenceDTO {
  id: string;
  branchName: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  isActive: boolean;
  type: GeofenceType;
  parentId: string | null;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toGeofenceDTO(doc: IGeofence): GeofenceDTO {
  const [lng, lat] = doc.center.coordinates;
  return {
    id: doc.id as string,
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

export interface OfficeSummaryDTO {
  officeId: string;
  assigned: number;
  attendanceRate: number;
}

export interface NearestGeofenceResult {
  geofence: GeofenceDTO;
  distanceMeters: number;
  isInside: boolean;
}
