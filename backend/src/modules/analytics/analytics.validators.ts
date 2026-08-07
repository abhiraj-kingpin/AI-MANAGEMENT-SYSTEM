import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const dashboardKpisQuerySchema = z.object({
  query: z.object({
    // Defaults to "today" in analytics.service.ts — Zod's `.default()` can't
    // reach for `new Date()` at validation time without baking in the
    // request's parse time, so the default lives in the service instead.
    date: z.coerce.date().optional(),
    departmentId: objectIdString.optional(),
  }),
});

export const attendanceTrendQuerySchema = z.object({
  query: z.object({
    months: z.coerce.number().int().min(1).max(24).default(6),
    departmentId: objectIdString.optional(),
  }),
});

export const departmentComparisonQuerySchema = z.object({
  query: z.object({
    date: z.coerce.date().optional(),
  }),
});

export const exportAttendanceCsvQuerySchema = z.object({
  query: z
    .object({
      from: z.coerce.date(),
      to: z.coerce.date(),
      departmentId: objectIdString.optional(),
    })
    .refine((q) => q.from.getTime() <= q.to.getTime(), {
      message: '`from` must not be after `to`.',
    }),
});

export type DashboardKpisQuery = z.infer<typeof dashboardKpisQuerySchema>['query'];
export type AttendanceTrendQuery = z.infer<typeof attendanceTrendQuerySchema>['query'];
export type DepartmentComparisonQuery = z.infer<typeof departmentComparisonQuerySchema>['query'];
export type ExportAttendanceCsvQuery = z.infer<typeof exportAttendanceCsvQuerySchema>['query'];
