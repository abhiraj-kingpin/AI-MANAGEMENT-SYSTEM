import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as salaryController from './salary.controller';
import {
  createSalarySchema,
  listSalariesQuerySchema,
  updateSalarySchema,
} from './salary.validators';

const router = Router();

// Base salary structure is HR/Admin-only, full stop — no employee
// self-service view here (payslips, not raw comp structure, are what an
// employee sees — see payslip.routes.ts#/payslips/me), per
// docs/architecture/04-api-documentation.md#payroll-payroll.
router.use(authenticate, requireRole('super_admin', 'hr'));

router.get('/', validate(listSalariesQuerySchema), salaryController.listSalaries);
router.post('/', validate(createSalarySchema), salaryController.createSalary);
router.patch('/:employeeId', validate(updateSalarySchema), salaryController.updateSalary);

export { router as salaryRouter };
