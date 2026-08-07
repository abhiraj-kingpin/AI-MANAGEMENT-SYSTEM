import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { analyticsService } from './analytics.service';
import type {
  AttendanceTrendQuery,
  DashboardKpisQuery,
  DepartmentComparisonQuery,
  ExportAttendanceCsvQuery,
} from './analytics.validators';

export const getDashboardKpis = asyncHandler(async (req, res) => {
  const query = req.validated!.query as DashboardKpisQuery;
  const kpis = await analyticsService.getDashboardKpis(actorFromRequest(req), query);
  sendSuccess(res, kpis);
});

export const getAttendanceTrend = asyncHandler(async (req, res) => {
  const query = req.validated!.query as AttendanceTrendQuery;
  const trend = await analyticsService.getAttendanceTrend(actorFromRequest(req), query);
  sendSuccess(res, trend);
});

export const getDepartmentComparison = asyncHandler(async (req, res) => {
  const query = req.validated!.query as DepartmentComparisonQuery;
  const comparison = await analyticsService.getDepartmentComparison(query);
  sendSuccess(res, comparison);
});

export const exportAttendanceCsv = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ExportAttendanceCsvQuery;
  const csv = await analyticsService.exportAttendanceCsv(query);

  const from = query.from.toISOString().slice(0, 10);
  const to = query.to.toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${from}-to-${to}.csv"`);
  res.send(csv);
});
