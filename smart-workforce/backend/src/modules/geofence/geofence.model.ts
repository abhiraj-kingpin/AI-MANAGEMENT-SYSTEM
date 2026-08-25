import { type Document, Schema, type Types, model } from 'mongoose';

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export const GEOFENCE_TYPES = ['building', 'floor', 'room'] as const;
export type GeofenceType = (typeof GEOFENCE_TYPES)[number];

export interface IGeofence extends Document {
  branchName: string;
  center: GeoJsonPoint;
  radiusMeters: number;
  isActive: boolean;
  // Buildings carry their own geofence and stand alone (parentId null).
  // Floors and rooms sit inside a building, inherit its center/radius for
  // GPS matching, and exist mainly as capacity/roster bookkeeping — see
  // Offices & Locations.
  type: GeofenceType;
  parentId: Types.ObjectId | null;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const geoJsonPointSchema = new Schema<GeoJsonPoint>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) =>
          value.length === 2 &&
          value[1] >= -90 &&
          value[1] <= 90 &&
          value[0] >= -180 &&
          value[0] <= 180,
        message: 'coordinates must be [lng, lat] within valid GPS ranges.',
      },
    },
  },
  { _id: false },
);

const geofenceSchema = new Schema<IGeofence>(
  {
    branchName: { type: String, required: true, trim: true },
    center: { type: geoJsonPointSchema, required: true },
    radiusMeters: { type: Number, required: true, default: 150, min: 10 },
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: GEOFENCE_TYPES, default: 'building' },
    parentId: { type: Schema.Types.ObjectId, ref: 'Geofence', default: null, index: true },
    capacity: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

geofenceSchema.index({ center: '2dsphere' });

export const Geofence = model<IGeofence>('Geofence', geofenceSchema);
