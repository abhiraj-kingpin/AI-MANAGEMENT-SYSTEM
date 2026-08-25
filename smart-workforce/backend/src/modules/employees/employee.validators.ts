import { z } from 'zod';
import { ROLES } from '../../shared/constants/roles';
import { objectIdString } from '../../shared/validators/objectId';
import { EMPLOYEE_DOCUMENT_TYPES } from './document.model';
import { EMPLOYMENT_STATUSES } from './employee.model';

const emergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    relationship: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .partial();

const addressSchema = z
  .object({
    line1: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    country: z.string().trim().optional(),
  })
  .partial();

const PHONE_REGEX = /^[+\d][\d\s-]{6,14}$/;

export const createEmployeeSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(ROLES).exclude(['super_admin']).optional(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    phone: z.string().regex(PHONE_REGEX, 'Invalid phone number'),
    departmentId: objectIdString,
    designation: z.string().trim().min(1),
    managerId: objectIdString.optional(),
    primaryOfficeId: objectIdString.optional(),
    dateOfJoining: z.coerce.date(),
    emergencyContact: emergencyContactSchema.optional(),
    address: addressSchema.optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1),
      phone: z.string().regex(PHONE_REGEX, 'Invalid phone number'),
      departmentId: objectIdString,
      designation: z.string().trim().min(1),
      managerId: objectIdString.nullable(),
      primaryOfficeId: objectIdString.nullable(),
      dateOfJoining: z.coerce.date(),
      employmentStatus: z.enum(EMPLOYMENT_STATUSES),
      emergencyContact: emergencyContactSchema,
      address: addressSchema,
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export const listEmployeesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    department: objectIdString.optional(),
    status: z.enum(EMPLOYMENT_STATUSES).optional(),
    sortBy: z.enum(['firstName', 'lastName', 'dateOfJoining', 'createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const searchEmployeesQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().min(1),
  }),
});

export const uploadDocumentBodySchema = z.object({
  body: z.object({
    type: z.enum(EMPLOYEE_DOCUMENT_TYPES),
  }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>['body'];
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>['body'];
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>['query'];
