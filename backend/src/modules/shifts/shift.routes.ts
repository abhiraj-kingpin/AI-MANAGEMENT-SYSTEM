import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as shiftController from './shift.controller';
import * as shiftAssignmentController from './shiftAssignment.controller';
import { createShiftSchema, listShiftsQuerySchema, updateShiftSchema } from './shift.validators';
import { assignShiftSchema, bulkAssignShiftSchema } from './shiftAssignment.validators';

const router = Router();

router.use(authenticate);

// Self-service — always the caller's own current assignment.
router.get('/me', shiftAssignmentController.getMyShift);

// Shift definitions + assignment — HR/Admin only, per
// docs/architecture/04-api-documentation.md#shifts-shifts.
router.get(
  '/',
  requireRole('super_admin', 'hr'),
  validate(listShiftsQuerySchema),
  shiftController.listShifts,
);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createShiftSchema),
  shiftController.createShift,
);
router.patch(
  '/:id',
  requireRole('super_admin', 'hr'),
  validate(updateShiftSchema),
  shiftController.updateShift,
);
router.delete('/:id', requireRole('super_admin', 'hr'), shiftController.deactivateShift);

router.post(
  '/assign',
  requireRole('super_admin', 'hr'),
  validate(assignShiftSchema),
  shiftAssignmentController.assignShift,
);
router.post(
  '/assign/bulk',
  requireRole('super_admin', 'hr'),
  validate(bulkAssignShiftSchema),
  shiftAssignmentController.bulkAssignShift,
);

export { router as shiftRouter };
