import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';
import { NOTIFICATION_TYPES } from './notification.model';

export const listMyNotificationsQuerySchema = z.object({
  query: z.object({
    unread: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const broadcastSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(1000),
    type: z.enum(NOTIFICATION_TYPES).default('announcement'),
    departmentId: objectIdString.optional(),
  }),
});

export const deviceTokenSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1),
  }),
});

export type ListMyNotificationsQuery = z.infer<typeof listMyNotificationsQuerySchema>['query'];
export type BroadcastInput = z.infer<typeof broadcastSchema>['body'];
export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>['body'];
