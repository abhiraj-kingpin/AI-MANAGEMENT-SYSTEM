import { z } from 'zod';

export const createHolidaySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    date: z.coerce.date(),
    isOptional: z.boolean().optional(),
  }),
});

export const listHolidaysQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().optional(),
  }),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>['body'];
export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>['query'];
