import { z } from 'zod';
import { SHIFT_TYPES } from './shift.model';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour — mirrors shift.model.ts

export const createShiftSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    type: z.enum(SHIFT_TYPES),
    startTime: z.string().regex(TIME_REGEX, 'Expected 24-hour HH:mm'),
    endTime: z.string().regex(TIME_REGEX, 'Expected 24-hour HH:mm'),
    gracePeriodMinutes: z.coerce.number().int().min(0).default(10),
  }),
});

export const updateShiftSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1),
      type: z.enum(SHIFT_TYPES),
      startTime: z.string().regex(TIME_REGEX, 'Expected 24-hour HH:mm'),
      endTime: z.string().regex(TIME_REGEX, 'Expected 24-hour HH:mm'),
      gracePeriodMinutes: z.coerce.number().int().min(0),
      isActive: z.boolean(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export const listShiftsQuerySchema = z.object({
  query: z.object({
    // Not `z.coerce.boolean()` — that's `Boolean(str)`, which is `true` for
    // *any* non-empty string, including the literal text "false". An
    // explicit enum+transform is the only way `?includeInactive=false`
    // means false. Found while writing Phase 12's notification query
    // validator (same bug, fixed there too) — a real bug, not hypothetical:
    // `?includeInactive=false` was silently behaving like `true`.
    includeInactive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>['body'];
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>['body'];
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>['query'];
