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

// Team-scoped: a Manager sees only their own direct reports, HR/Admin see
// the whole org (optionally filtered to one department) — access-checked
// inside analytics.service.ts, the same route-vs-service split used by
// leave.routes.ts#list and employee.routes.ts#listEmployees.
router.get('/dashboard', validate(dashboardKpisQuerySchema), analyticsController.getDashboardKpis);
router.get(
  '/attendance-trend',
  validate(attendanceTrendQuerySchema),
  analyticsController.getAttendanceTrend,
);

// Cross-department reports — HR/Admin only; there is no "my team" reading of
// a comparison across every department, so this is gated at the route like
// payslip.routes.ts#list. Paths mirror docs/architecture/04-api-documentation.md's
// Phase 0 analytics contract.
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
// Same records, same query contract as /export/csv — reuses its validator
// rather than a duplicate PDF-flavored schema, since the shape (from/to/
// departmentId) has nothing CSV-specific about it.
router.get(
  '/export/pdf',
  requireRole('super_admin', 'hr'),
  validate(exportAttendanceCsvQuerySchema),
  analyticsController.exportAttendancePdf,
);

// Phase 15 — AI-assisted analytics. Real statistical/rule-based scoring,
// explicitly labeled as such (see analytics.ai.service.ts), not a trained
// model. late-risk/absenteeism-trend are team-scoped like the endpoints
// above; anomalies is an HR/Admin-only investigative sweep with no "my
// team" reading, so it's gated at the route like department-comparison.
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
