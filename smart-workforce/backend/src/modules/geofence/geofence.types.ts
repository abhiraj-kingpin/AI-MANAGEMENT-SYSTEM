import type { IGeofence } from './geofence.model';

export interface GeofenceDTO {
  id: string;
  branchName: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  isActive: boolean;
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface NearestGeofenceResult {
  geofence: GeofenceDTO;
  distanceMeters: number;
  isInside: boolean;
}
