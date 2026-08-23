import { type Document, Schema, model } from 'mongoose';

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface IGeofence extends Document {
  branchName: string;
  center: GeoJsonPoint;
  radiusMeters: number;
  isActive: boolean;
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
  },
  { timestamps: true },
);

geofenceSchema.index({ center: '2dsphere' });

export const Geofence = model<IGeofence>('Geofence', geofenceSchema);
