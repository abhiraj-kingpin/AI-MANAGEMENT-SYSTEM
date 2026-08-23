import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as payslipController from './payslip.controller';
import { listPayslipsQuerySchema, myPayslipsQuerySchema } from './payslip.validators';

const router = Router();

router.use(authenticate);

router.get('/me', validate(myPayslipsQuerySchema), payslipController.getMyPayslips);

router.get('/:id/pdf', payslipController.downloadPayslipPdf);

router.get(
  '/',
  requireRole('super_admin', 'hr'),
  validate(listPayslipsQuerySchema),
  payslipController.listPayslips,
);
router.patch('/:id/release', requireRole('super_admin', 'hr'), payslipController.releasePayslip);

export { router as payslipRouter };
