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

// Self-service — always the caller's own record.
router.post('/', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/me', validate(myLeavesQuerySchema), leaveController.getMyLeaves);
router.get('/balance', leaveController.getMyBalance);
router.patch('/:id/cancel', leaveController.cancelLeave);

// Review queue — Super Admin/HR/Manager, scoped inside the service
// (a Manager only ever sees/reviews their own team — see leave.service.ts).
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

// Year-end batch action — Super Admin/HR only, org-wide, not scoped to a
// Manager's team (matches payroll's "Run Payroll" being Super Admin/HR-only
// for the same reason: a batch action that touches every employee, not a
// per-request review).
router.post(
  '/carry-forward',
  requireRole('super_admin', 'hr'),
  validate(carryForwardSchema),
  leaveController.carryForward,
);

export { router as leaveRouter };
