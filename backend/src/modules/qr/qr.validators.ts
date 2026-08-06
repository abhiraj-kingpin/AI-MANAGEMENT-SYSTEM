import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const generateQrSchema = z.object({
  body: z.object({
    geofenceId: objectIdString,
    validForMinutes: z.coerce.number().int().min(1).max(60).optional(),
    singleUse: z.boolean().optional(),
  }),
});

export const activeQrQuerySchema = z.object({
  query: z.object({
    geofenceId: objectIdString,
  }),
});

export type GenerateQrInput = z.infer<typeof generateQrSchema>['body'];
export type ActiveQrQuery = z.infer<typeof activeQrQuerySchema>['query'];
