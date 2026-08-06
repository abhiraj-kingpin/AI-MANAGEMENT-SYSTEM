import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as leaveTypeController from './leaveType.controller';
import { createLeaveTypeSchema } from './leaveType.validators';

const router = Router();

router.use(authenticate);

// Read is open to any authenticated user — an employee needs to know what
// leave types exist to apply for one. Management (create) is HR/Admin only,
// per docs/architecture/04-api-documentation.md#leave-leaves.
router.get('/', leaveTypeController.listLeaveTypes);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createLeaveTypeSchema),
  leaveTypeController.createLeaveType,
);

export { router as leaveTypeRouter };
