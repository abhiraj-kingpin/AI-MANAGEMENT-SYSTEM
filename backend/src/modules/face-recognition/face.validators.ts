import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

// Multer parses the multipart `employeeId` text field into req.body as a
// string alongside the uploaded files — this only validates that field.
export const registerFaceSchema = z.object({
  body: z.object({
    employeeId: objectIdString.optional(),
  }),
});

export const registrationStatusQuerySchema = z.object({
  query: z.object({
    employeeId: objectIdString.optional(),
  }),
});

export const verifyFaceSchema = z.object({
  body: z.object({
    embedding: z.array(z.number()).min(64).max(1024),
  }),
});

export type RegisterFaceInput = z.infer<typeof registerFaceSchema>['body'];
export type RegistrationStatusQuery = z.infer<typeof registrationStatusQuerySchema>['query'];
export type VerifyFaceInput = z.infer<typeof verifyFaceSchema>['body'];
