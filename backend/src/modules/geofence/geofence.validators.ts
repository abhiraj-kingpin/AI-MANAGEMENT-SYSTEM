import { z } from 'zod';

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createGeofenceSchema = z.object({
  body: z.object({
    branchName: z.string().trim().min(1),
    center: pointSchema,
    radiusMeters: z.coerce.number().min(10).max(5000).default(150),
  }),
});

export const updateGeofenceSchema = z.object({
  body: z
    .object({
      branchName: z.string().trim().min(1),
      center: pointSchema,
      radiusMeters: z.coerce.number().min(10).max(5000),
      isActive: z.boolean(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export const nearbyQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
});

export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>['body'];
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>['body'];
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>['query'];
