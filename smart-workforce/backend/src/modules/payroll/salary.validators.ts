import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

const allowancesSchema = z.object({
  hra: z.coerce.number().min(0).optional(),
  transport: z.coerce.number().min(0).optional(),
  medical: z.coerce.number().min(0).optional(),
  other: z.coerce.number().min(0).optional(),
});

const deductionsSchema = z.object({
  pf: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  other: z.coerce.number().min(0).optional(),
});

export const createSalarySchema = z.object({
  body: z.object({
    employeeId: objectIdString,
    baseSalary: z.coerce.number().min(0),
    allowances: allowancesSchema.optional(),
    deductions: deductionsSchema.optional(),
    currency: z.string().trim().length(3).default('INR'),
    effectiveFrom: z.coerce.date(),
  }),
});

export const updateSalarySchema = z.object({
  body: z
    .object({
      baseSalary: z.coerce.number().min(0),
      allowances: allowancesSchema,
      deductions: deductionsSchema,
      currency: z.string().trim().length(3),
      effectiveFrom: z.coerce.date(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export const listSalariesQuerySchema = z.object({
  query: z.object({
    employeeId: objectIdString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateSalaryInput = z.infer<typeof createSalarySchema>['body'];
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>['body'];
export type ListSalariesQuery = z.infer<typeof listSalariesQuerySchema>['query'];
