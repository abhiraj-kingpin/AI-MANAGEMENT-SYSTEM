import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as attendanceController from './attendance.controller';
import {
  absenceSweepSchema,
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  listAttendanceQuerySchema,
  myAttendanceQuerySchema,
  requestCorrectionSchema,
  reviewCorrectionSchema,
  syncAttendanceSchema,
} from './attendance.validators';

const router = Router();

router.use(authenticate);

// Self-service — always operates on the caller's own employeeId (resolved
// from the JWT), for every role. No "punch on behalf of someone else" here;
// that's what HR's direct correction endpoint below is for.
router.post('/check-in', validate(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut);
router.post('/sync', validate(syncAttendanceSchema), attendanceController.syncAttendance);
router.post('/break/start', attendanceController.breakStart);
router.post('/break/end', attendanceController.breakEnd);
router.get('/me', validate(myAttendanceQuerySchema), attendanceController.getMyAttendance);
router.post(
  '/:id/request-correction',
  validate(requestCorrectionSchema),
  attendanceController.requestCorrection,
);

// Reports & exports — HR/Manager/Admin only, scoped inside the service
// (a Manager only ever sees their own team — see attendance.service.ts#buildAttendanceFilter).
router.get(
  '/',
  requireRole('super_admin', 'hr', 'manager'),
  validate(listAttendanceQuerySchema),
  attendanceController.listAttendance,
);
router.get(
  '/export/excel',
  requireRole('super_admin', 'hr'),
  validate(listAttendanceQuerySchema),
  attendanceController.exportExcel,
);
router.get(
  '/export/pdf',
  requireRole('super_admin', 'hr'),
  validate(listAttendanceQuerySchema),
  attendanceController.exportPdf,
);
// Batch action, org-wide — Super Admin/HR only, same reasoning as leave's
// carry-forward endpoint (leave.routes.ts): a sweep that touches every
// employee isn't a per-request review a Manager should trigger.
router.post(
  '/absence-sweep',
  requireRole('super_admin', 'hr'),
  validate(absenceSweepSchema),
  attendanceController.absenceSweep,
);

// Corrections
router.patch(
  '/:id/correct',
  requireRole('super_admin', 'hr'),
  validate(correctAttendanceSchema),
  attendanceController.correctAttendance,
);
router.post(
  '/:id/approve-correction',
  requireRole('super_admin', 'hr', 'manager'),
  validate(reviewCorrectionSchema),
  attendanceController.approveCorrection,
);
router.post(
  '/:id/reject-correction',
  requireRole('super_admin', 'hr', 'manager'),
  validate(reviewCorrectionSchema),
  attendanceController.rejectCorrection,
);

export { router as attendanceRouter };
