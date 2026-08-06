import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as payslipController from './payslip.controller';
import { listPayslipsQuerySchema, myPayslipsQuerySchema } from './payslip.validators';

const router = Router();

router.use(authenticate);

// Self-service — always the caller's own, released-only history.
router.get('/me', validate(myPayslipsQuerySchema), payslipController.getMyPayslips);

// PDF download is open to any authenticated user — access is scoped inside
// payslip.service.ts#getForDownload (HR/Admin: any status; employee: own +
// released only), the same route-vs-service split used for
// employees.getById in Phase 4.
router.get('/:id/pdf', payslipController.downloadPayslipPdf);

router.get(
  '/',
  requireRole('super_admin', 'hr'),
  validate(listPayslipsQuerySchema),
  payslipController.listPayslips,
);
router.patch('/:id/release', requireRole('super_admin', 'hr'), payslipController.releasePayslip);

export { router as payslipRouter };
