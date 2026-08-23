import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as qrController from './qr.controller';
import { activeQrQuerySchema, generateQrSchema } from './qr.validators';

const router = Router();

router.use(authenticate, requireRole('super_admin', 'hr'));

router.post('/generate', validate(generateQrSchema), qrController.generateQr);
router.get('/active', validate(activeQrQuerySchema), qrController.activeQr);
router.post('/:id/revoke', qrController.revokeQr);

export { router as qrRouter };
