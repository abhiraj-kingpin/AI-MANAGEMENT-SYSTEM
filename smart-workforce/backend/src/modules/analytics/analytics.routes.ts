import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as aiController from './analytics.ai.controller';
import {
  absenteeismTrendQuerySchema,
  anomaliesQuerySchema,
  lateRiskQuerySchema,
} from './analytics.ai.validators';
import * as analyticsController from './analytics.controller';
import {
  attendanceTrendQuerySchema,
  dashboardKpisQuerySchema,
  departmentComparisonQuerySchema,
  exportAttendanceCsvQuerySchema,
} from './analytics.validators';

const router = Router();

router.use(authenticate);

router.get('/dashboard', validate(dashboardKpisQuerySchema), analyticsController.getDashboardKpis);
router.get(
  '/attendance-trend',
  validate(attendanceTrendQuerySchema),
  analyticsController.getAttendanceTrend,
);

router.get(
  '/department-comparison',
  requireRole('super_admin', 'hr'),
  validate(departmentComparisonQuerySchema),
  analyticsController.getDepartmentComparison,
);
router.get(
  '/export/csv',
  requireRole('super_admin', 'hr'),
  validate(exportAttendanceCsvQuerySchema),
  analyticsController.exportAttendanceCsv,
);
router.get(
  '/export/pdf',
  requireRole('super_admin', 'hr'),
  validate(exportAttendanceCsvQuerySchema),
  analyticsController.exportAttendancePdf,
);

router.get('/ai/late-risk', validate(lateRiskQuerySchema), aiController.getLateRisk);
router.get(
  '/ai/absenteeism-trend',
  validate(absenteeismTrendQuerySchema),
  aiController.getAbsenteeismTrend,
);
router.get(
  '/ai/anomalies',
  requireRole('super_admin', 'hr'),
  validate(anomaliesQuerySchema),
  aiController.getAnomalies,
);

export { router as analyticsRouter };
