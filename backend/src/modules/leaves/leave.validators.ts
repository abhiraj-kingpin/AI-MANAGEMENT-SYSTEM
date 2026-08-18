import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';
import { LEAVE_STATUSES } from './leave.model';

export const applyLeaveSchema = z.object({
  body: z
    .object({
      leaveTypeId: objectIdString,
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: z.string().trim().min(1, 'A reason is required.').max(500),
    })
    .refine((body) => body.endDate.getTime() >= body.startDate.getTime(), {
      message: 'endDate must be on or after startDate.',
      path: ['endDate'],
    }),
});

export const listLeavesQuerySchema = z.object({
  query: z.object({
    employeeId: objectIdString.optional(),
    status: z.enum(LEAVE_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const myLeavesQuerySchema = z.object({
  query: z.object({
    status: z.enum(LEAVE_STATUSES).optional(),
  }),
});

export const approveLeaveSchema = z.object({
  body: z.object({
    comment: z.string().trim().max(500).optional(),
  }),
});

export const rejectLeaveSchema = z.object({
  body: z.object({
    comment: z.string().trim().min(1, 'A comment is required when rejecting a leave.').max(500),
  }),
});

// Both optional — the controller defaults to "last calendar year into this
// one" when omitted, the common case (see leave.controller.ts#carryForward).
// Bounded to a sane range so a typo doesn't silently write balances for
// year 0 or year 99999.
export const carryForwardSchema = z.object({
  body: z.object({
    fromYear: z.coerce.number().int().min(2000).max(3000).optional(),
    toYear: z.coerce.number().int().min(2000).max(3000).optional(),
  }),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>['body'];
export type ListLeavesQuery = z.infer<typeof listLeavesQuerySchema>['query'];
export type MyLeavesQuery = z.infer<typeof myLeavesQuerySchema>['query'];
export type CarryForwardInput = z.infer<typeof carryForwardSchema>['body'];
