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

router.post(
  '/register',
  uploadImage.array('images', 5),
  validate(registerFaceSchema),
  faceController.registerFace,
);
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

router.get(
  '/admin/enrollments',
  requireRole('super_admin', 'hr'),
  faceController.listEnrollments,
);
router.get('/admin/stats', requireRole('super_admin', 'hr'), faceController.enrollmentStats);

router.delete('/:employeeId', requireRole('super_admin', 'hr'), faceController.deleteFaceData);

export { router as faceRouter };
