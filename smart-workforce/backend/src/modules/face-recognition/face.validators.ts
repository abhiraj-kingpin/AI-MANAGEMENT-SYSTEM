import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

export const registerFaceSchema = z.object({
  body: z.object({
    employeeId: objectIdString.optional(),
  }),
});

export const registerFaceEmbeddingsSchema = z.object({
  body: z.object({
    employeeId: objectIdString.optional(),
    embeddings: z.array(z.array(z.number()).min(64).max(1024)).min(3).max(5),
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
export type RegisterFaceEmbeddingsInput = z.infer<typeof registerFaceEmbeddingsSchema>['body'];
export type RegistrationStatusQuery = z.infer<typeof registrationStatusQuerySchema>['query'];
export type VerifyFaceInput = z.infer<typeof verifyFaceSchema>['body'];
