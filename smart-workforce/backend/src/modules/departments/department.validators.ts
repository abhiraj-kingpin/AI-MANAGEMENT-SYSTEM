import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    code: z.string().trim().min(1).max(10),
    headOfDepartment: objectIdString.optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1),
      code: z.string().trim().min(1).max(10),
      headOfDepartment: objectIdString.nullable(),
      isActive: z.boolean(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export const listDepartmentsQuerySchema = z.object({
  query: z.object({
    includeInactive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>['body'];
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>['body'];
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>['query'];
