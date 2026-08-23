import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as auditController from './audit.controller';
import { listAuditLogsQuerySchema } from './audit.validators';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  validate(listAuditLogsQuerySchema),
  auditController.list,
);

export { router as auditRouter };
