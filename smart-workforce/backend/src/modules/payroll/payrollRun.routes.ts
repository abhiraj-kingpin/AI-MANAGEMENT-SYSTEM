import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as payrollRunController from './payrollRun.controller';
import { runPayrollSchema } from './payrollRun.validators';

const router = Router();

router.use(authenticate, requireRole('super_admin', 'hr'));

router.post('/run', validate(runPayrollSchema), payrollRunController.runPayroll);
router.get('/runs/:runId/status', payrollRunController.getPayrollRunStatus);

export { router as payrollRunRouter };
