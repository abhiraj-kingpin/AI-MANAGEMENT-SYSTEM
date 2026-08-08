import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as departmentController from './department.controller';
import {
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from './department.validators';

const router = Router();

router.use(authenticate);

// Read is open to any authenticated user — every department dropdown
// (employee filters, employee creation/edit forms) needs this regardless of
// the caller's role; management is Super Admin/HR only, same reasoning as
// leave-types and holidays.
router.get('/', validate(listDepartmentsQuerySchema), departmentController.listDepartments);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createDepartmentSchema),
  departmentController.createDepartment,
);
router.patch(
  '/:id',
  requireRole('super_admin', 'hr'),
  validate(updateDepartmentSchema),
  departmentController.updateDepartment,
);

export { router as departmentRouter };
