import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { uploadImage } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as faceController from './face.controller';
import {
  registerFaceEmbeddingsSchema,
  registerFaceSchema,
  registrationStatusQuerySchema,
  verifyFaceSchema,
} from './face.validators';

const router = Router();

router.use(authenticate);

// Self, or HR/Admin acting on someone else's face data — enforced inside
// face.service.ts#resolveTargetEmployeeId (depends on *whose* data, not
// just the caller's role).
router.post(
  '/register',
  uploadImage.array('images', 5),
  validate(registerFaceSchema),
  faceController.registerFace,
);
// Mobile's on-device-computed-embedding path — a plain JSON body, no
// multipart/image upload at all (see faceEmbedding.model.ts's
// sourceImageUrl doc comment for why that's by design here).
router.post(
  '/register-embeddings',
  validate(registerFaceEmbeddingsSchema),
  faceController.registerFaceEmbeddings,
);
router.get(
  '/registration-status',
  validate(registrationStatusQuerySchema),
  faceController.registrationStatus,
);
router.post('/verify', validate(verifyFaceSchema), faceController.verifyFace);

// Right-to-erasure for biometric data — HR/Admin only, hard delete.
router.delete('/:employeeId', requireRole('super_admin', 'hr'), faceController.deleteFaceData);

export { router as faceRouter };
