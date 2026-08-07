import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as auditController from './audit.controller';
import { listAuditLogsQuerySchema } from './audit.validators';

const router = Router();

// Super Admin only — an audit trail is itself a sensitive record (it can
// reveal who changed what, including for other admins), per
// docs/architecture/04-api-documentation.md#audit-audit-logs--super-admin-only.
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  validate(listAuditLogsQuerySchema),
  auditController.list,
);

export { router as auditRouter };
