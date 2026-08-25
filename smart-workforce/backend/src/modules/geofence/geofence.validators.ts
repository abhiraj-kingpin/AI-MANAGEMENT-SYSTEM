import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';
import { GEOFENCE_TYPES } from './geofence.model';

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createGeofenceSchema = z.object({
  body: z
    .object({
      branchName: z.string().trim().min(1),
      type: z.enum(GEOFENCE_TYPES).default('building'),
      // A building carries its own geofence. A floor/room sits inside one
      // (parentId) and inherits its center/radius — see geofence.service.
      parentId: objectIdString.optional(),
      capacity: z.coerce.number().int().min(0).optional(),
      center: pointSchema.optional(),
      radiusMeters: z.coerce.number().min(10).max(5000).optional(),
    })
    .superRefine((body, ctx) => {
      if (body.type === 'building' && !body.center) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['center'],
          message: 'A building needs a center point.',
        });
      }
      if (body.type !== 'building' && !body.parentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parentId'],
          message: 'A floor or room needs a parent building.',
        });
      }
    }),
});

export const updateGeofenceSchema = z.object({
  body: z
    .object({
      branchName: z.string().trim().min(1),
      center: pointSchema,
      radiusMeters: z.coerce.number().min(10).max(5000),
      capacity: z.coerce.number().int().min(0),
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
