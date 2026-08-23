import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as leaveTypeController from './leaveType.controller';
import { createLeaveTypeSchema } from './leaveType.validators';

const router = Router();

router.use(authenticate);

router.get('/', leaveTypeController.listLeaveTypes);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createLeaveTypeSchema),
  leaveTypeController.createLeaveType,
);

export { router as leaveTypeRouter };
