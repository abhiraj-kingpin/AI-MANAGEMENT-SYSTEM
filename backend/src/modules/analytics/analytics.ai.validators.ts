import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const lateRiskQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(7).max(180).default(30),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    departmentId: objectIdString.optional(),
  }),
});

export const absenteeismTrendQuerySchema = z.object({
  query: z.object({
    months: z.coerce.number().int().min(3).max(24).default(6),
    departmentId: objectIdString.optional(),
  }),
});

export const anomaliesQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).default(30),
  }),
});

export type LateRiskQuery = z.infer<typeof lateRiskQuerySchema>['query'];
export type AbsenteeismTrendQuery = z.infer<typeof absenteeismTrendQuerySchema>['query'];
export type AnomaliesQuery = z.infer<typeof anomaliesQuerySchema>['query'];
