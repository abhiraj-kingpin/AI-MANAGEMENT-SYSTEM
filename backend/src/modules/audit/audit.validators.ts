import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const listAuditLogsQuerySchema = z.object({
  query: z.object({
    entityType: z.string().trim().min(1).optional(),
    entityId: objectIdString.optional(),
    actorId: objectIdString.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>['query'];
