import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { uploadDocument, uploadImage } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as employeeController from './employee.controller';
import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  searchEmployeesQuerySchema,
  updateEmployeeSchema,
  uploadDocumentBodySchema,
} from './employee.validators';

const router = Router();

router.use(authenticate);

// List/search/create/delete are gated by role outright — no resource-level
// ownership question to ask. Get/update/upload are scoped inside
// employee.service.ts (self vs. team vs. everyone) since "can I touch this
// specific employee" depends on *which* employee, not just the caller's role.
router.get(
  '/search',
  requireRole('super_admin', 'hr', 'manager'),
  validate(searchEmployeesQuerySchema),
  employeeController.searchEmployees,
);
router.get(
  '/',
  requireRole('super_admin', 'hr', 'manager'),
  validate(listEmployeesQuerySchema),
  employeeController.listEmployees,
);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createEmployeeSchema),
  employeeController.createEmployee,
);
router.get('/:id', employeeController.getEmployee);
router.patch('/:id', validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', requireRole('super_admin', 'hr'), employeeController.deleteEmployee);

router.post('/:id/image', uploadImage.single('file'), employeeController.uploadEmployeeImage);
router.post(
  '/:id/documents',
  uploadDocument.single('file'),
  validate(uploadDocumentBodySchema),
  employeeController.uploadEmployeeDocument,
);
router.get('/:id/documents', employeeController.listEmployeeDocuments);

export { router as employeeRouter };
