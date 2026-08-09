import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';

// Multer parses the multipart `employeeId` text field into req.body as a
// string alongside the uploaded files — this only validates that field.
export const registerFaceSchema = z.object({
  body: z.object({
    employeeId: objectIdString.optional(),
  }),
});

// Bounds mirror face.service.ts's MIN_REGISTRATION_IMAGES/MAX_REGISTRATION_IMAGES
// (3-5) — the same reference-set size whether registration arrives as
// uploaded images or client-computed embeddings.
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
