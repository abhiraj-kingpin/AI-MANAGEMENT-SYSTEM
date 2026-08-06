import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';
import { PAYSLIP_STATUSES } from './payslip.model';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // "YYYY-MM" — mirrors payslip.model.ts

export const listPayslipsQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(MONTH_REGEX, 'Expected YYYY-MM').optional(),
    departmentId: objectIdString.optional(),
    employeeId: objectIdString.optional(),
    status: z.enum(PAYSLIP_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const myPayslipsQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(MONTH_REGEX, 'Expected YYYY-MM').optional(),
  }),
});

export type ListPayslipsQuery = z.infer<typeof listPayslipsQuerySchema>['query'];
export type MyPayslipsQuery = z.infer<typeof myPayslipsQuerySchema>['query'];
