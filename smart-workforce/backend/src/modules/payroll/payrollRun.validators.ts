import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const runPayrollSchema = z.object({
  body: z.object({
    month: z.string().regex(MONTH_REGEX, 'Expected YYYY-MM'),
    departmentId: objectIdString.optional(),
  }),
});

export type RunPayrollInput = z.infer<typeof runPayrollSchema>['body'];
