import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { attendanceService } from './attendance.service';
import type {
  CheckInInput,
  CheckOutInput,
  ListAttendanceQuery,
  MyAttendanceQuery,
  SyncAttendanceInput,
} from './attendance.validators';

export const checkIn = asyncHandler(async (req, res) => {
  const result = await attendanceService.checkIn(actorFromRequest(req), req.body as CheckInInput);
  sendSuccess(res, result);
});

export const checkOut = asyncHandler(async (req, res) => {
  const { location } = req.body as CheckOutInput;
  const result = await attendanceService.checkOut(actorFromRequest(req), location);
  sendSuccess(res, result);
});

export const syncAttendance = asyncHandler(async (req, res) => {
  const { punches } = req.body as SyncAttendanceInput;
  const results = await attendanceService.syncAttendance(actorFromRequest(req), punches);
  sendSuccess(res, results);
});

export const breakStart = asyncHandler(async (req, res) => {
  const result = await attendanceService.breakStart(actorFromRequest(req));
  sendSuccess(res, result);
});

export const breakEnd = asyncHandler(async (req, res) => {
  const result = await attendanceService.breakEnd(actorFromRequest(req));
  sendSuccess(res, result);
});

export const getMyAttendance = asyncHandler(async (req, res) => {
  const { from, to } = req.validated!.query as MyAttendanceQuery;
  const result = await attendanceService.getMyAttendance(actorFromRequest(req), { from, to });
  sendSuccess(res, result);
});

export const listAttendance = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListAttendanceQuery;
  const result = await attendanceService.listAttendance(query, actorFromRequest(req));
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const correctAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.correctAttendance(
    req.params.id,
    req.body,
    actorFromRequest(req),
  );
  sendSuccess(res, result);
});

export const requestCorrection = asyncHandler(async (req, res) => {
  const result = await attendanceService.requestCorrection(
    req.params.id,
    req.body,
    actorFromRequest(req),
  );
  sendSuccess(res, result, 201);
});

export const approveCorrection = asyncHandler(async (req, res) => {
  const result = await attendanceService.reviewCorrection(
    req.params.id,
    'approved',
    actorFromRequest(req),
    req.body.comment,
  );
  sendSuccess(res, result);
});

export const rejectCorrection = asyncHandler(async (req, res) => {
  const result = await attendanceService.reviewCorrection(
    req.params.id,
    'rejected',
    actorFromRequest(req),
    req.body.comment,
  );
  sendSuccess(res, result);
});

export const exportExcel = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListAttendanceQuery;
  const buffer = await attendanceService.exportExcel(query, actorFromRequest(req));
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.xlsx"');
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListAttendanceQuery;
  const buffer = await attendanceService.exportPdf(query, actorFromRequest(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.pdf"');
  res.send(buffer);
});
