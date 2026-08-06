import { z } from 'zod';

export const createLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    defaultAnnualQuota: z.coerce.number().min(0),
    isPaid: z.boolean().optional(),
    carryForward: z.boolean().optional(),
    maxCarryForwardDays: z.coerce.number().min(0).optional(),
  }),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>['body'];
