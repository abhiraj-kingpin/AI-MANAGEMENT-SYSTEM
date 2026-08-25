import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const assignShiftSchema = z.object({
  body: z.object({
    employeeId: objectIdString,
    shiftId: objectIdString,
    effectiveFrom: z.coerce.date(),
  }),
});

export const bulkAssignShiftSchema = z.object({
  body: z.object({
    employeeIds: z.array(objectIdString).min(1, 'At least one employee is required.'),
    shiftId: objectIdString,
    effectiveFrom: z.coerce.date(),
  }),
});

// Powers the Shifts roster grid — every assignment whose effective range
// touches the requested week, per employee.
export const listAssignmentsQuerySchema = z.object({
  query: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    departmentId: objectIdString.optional(),
  }),
});

export type AssignShiftInput = z.infer<typeof assignShiftSchema>['body'];
export type BulkAssignShiftInput = z.infer<typeof bulkAssignShiftSchema>['body'];
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>['query'];
