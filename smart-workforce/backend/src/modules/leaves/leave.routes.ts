import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as leaveController from './leave.controller';
import {
  applyLeaveSchema,
  approveLeaveSchema,
  carryForwardSchema,
  listLeavesQuerySchema,
  myLeavesQuerySchema,
  rejectLeaveSchema,
} from './leave.validators';

const router = Router();

router.use(authenticate);

router.post('/', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/me', validate(myLeavesQuerySchema), leaveController.getMyLeaves);
router.get('/balance', leaveController.getMyBalance);
router.patch('/:id/cancel', leaveController.cancelLeave);

router.get(
  '/',
  requireRole('super_admin', 'hr', 'manager'),
  validate(listLeavesQuerySchema),
  leaveController.listLeaves,
);
router.patch(
  '/:id/approve',
  requireRole('super_admin', 'hr', 'manager'),
  validate(approveLeaveSchema),
  leaveController.approveLeave,
);
router.patch(
  '/:id/reject',
  requireRole('super_admin', 'hr', 'manager'),
  validate(rejectLeaveSchema),
  leaveController.rejectLeave,
);

router.post(
  '/carry-forward',
  requireRole('super_admin', 'hr'),
  validate(carryForwardSchema),
  leaveController.carryForward,
);

export { router as leaveRouter };
