import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as settingsController from './settings.controller';
import { updateSettingsSchema } from './settings.validators';

const router = Router();

router.use(authenticate, requireRole('super_admin', 'hr'));

router.get('/', settingsController.getSettings);
router.patch('/', validate(updateSettingsSchema), settingsController.updateSettings);

export { router as settingsRouter };
