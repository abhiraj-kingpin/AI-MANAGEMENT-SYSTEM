import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { aiAnalyticsService } from './analytics.ai.service';
import type {
  AbsenteeismTrendQuery,
  AnomaliesQuery,
  LateRiskQuery,
} from './analytics.ai.validators';

export const getLateRisk = asyncHandler(async (req, res) => {
  const query = req.validated!.query as LateRiskQuery;
  const employees = await aiAnalyticsService.getLateRiskEmployees(actorFromRequest(req), query);
  sendSuccess(res, employees);
});

export const getAbsenteeismTrend = asyncHandler(async (req, res) => {
  const query = req.validated!.query as AbsenteeismTrendQuery;
  const forecast = await aiAnalyticsService.getAbsenteeismTrend(actorFromRequest(req), query);
  sendSuccess(res, forecast);
});

export const getAnomalies = asyncHandler(async (req, res) => {
  const query = req.validated!.query as AnomaliesQuery;
  const anomalies = await aiAnalyticsService.getAnomalies(query);
  sendSuccess(res, anomalies);
});
