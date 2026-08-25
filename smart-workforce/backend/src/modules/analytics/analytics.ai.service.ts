import { Types } from 'mongoose';
import { IsolationForest } from '../../shared/ml/isolationForest';
import type { ActorContext } from '../../shared/types/actorContext';
import { countBusinessDays } from '../../shared/utils/businessDays';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { haversineDistanceKm } from '../../shared/utils/geo';
import { round2 } from '../../shared/utils/math';
import { cosineSimilarity } from '../../shared/utils/vectorMath';
import { Attendance, type IAttendance } from '../attendance/attendance.model';
import { Department } from '../departments/department.model';
import { Employee } from '../employees/employee.model';
import { FaceEmbedding } from '../face-recognition/faceEmbedding.model';
import { getHolidayDatesInRange } from '../leaves/holiday.service';
import { resolveEmployeeIds } from './analytics.service';
import type {
  AbsenteeismDriverDTO,
  AbsenteeismForecastDTO,
  AbsenteeismTrendPointDTO,
  AnomalyDTO,
  DepartmentAbsenteeismRowDTO,
  LateRiskEmployeeDTO,
  RiskTrend,
} from './analytics.ai.types';
import type {
  AbsenteeismTrendQuery,
  AnomaliesQuery,
  LateRiskQuery,
} from './analytics.ai.validators';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ACCOUNTED_FOR_STATUSES = new Set(['present', 'late', 'half_day', 'on_leave']);

interface RegressionFit {
  slope: number;
  intercept: number;
  rSquared: number;
}

// Ordinary least squares over equally-spaced points (x = 0..n-1). Shared by
// the workspace-wide forecast and every per-department one below, so all of
// them are fit the same honest way — no per-department special-casing.
function fitLinearRegression(values: number[]): RegressionFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };
  if (n === 1) return { slope: 0, intercept: values[0], rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let x = 0; x < n; x += 1) {
    const y = values[x];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let x = 0; x < n; x += 1) {
    const y = values[x];
    const predicted = intercept + slope * x;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

function predictAt(fit: RegressionFit, x: number): number {
  return Math.max(0, Math.min(100, fit.intercept + fit.slope * x));
}

function residualStdError(values: number[], fit: RegressionFit): number {
  const n = values.length;
  if (n < 3) return 0;
  let ssRes = 0;
  for (let x = 0; x < n; x += 1) {
    ssRes += (values[x] - (fit.intercept + fit.slope * x)) ** 2;
  }
  return Math.sqrt(ssRes / (n - 2));
}

// Refits on all-but-the-last-3 months, scores the held-out 3 — the AI
// Insights forecast card's "backtest error" tile. Needs at least 5 points
// (2 to fit a line, 3 to hold out); returns null rather than a fabricated
// number when there isn't enough history yet.
function backtestMae(values: number[]): number | null {
  const HOLDOUT = 3;
  if (values.length < HOLDOUT + 2) return null;

  const trainLength = values.length - HOLDOUT;
  const fit = fitLinearRegression(values.slice(0, trainLength));

  let sumAbsError = 0;
  for (let i = 0; i < HOLDOUT; i += 1) {
    const x = trainLength + i;
    sumAbsError += Math.abs(values[x] - predictAt(fit, x));
  }
  return round2(sumAbsError / HOLDOUT);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// The month-bucketed absenteeism history shared by the workspace-wide
// forecast and every per-department breakdown row — same accounting rule
// (scheduled-but-unaccounted-for share of expected working days) either way.
async function computeAbsenteeismHistory(
  employeeIds: string[],
  months: number,
): Promise<AbsenteeismTrendPointDTO[]> {
  const now = new Date();
  const history: AbsenteeismTrendPointDTO[] = [];

  if (employeeIds.length === 0) {
    for (let i = months - 1; i >= 0; i -= 1) {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      history.push({ month: monthKey(monthStart), absenteeismRate: 0 });
    }
    return history;
  }

  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const objectIds = employeeIds.map((id) => new Types.ObjectId(id));

  const buckets = await Attendance.aggregate<{ _id: string; accounted: number }>([
    { $match: { employeeId: { $in: objectIds }, date: { $gte: rangeStart, $lte: rangeEnd } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        accounted: {
          $sum: { $cond: [{ $in: ['$status', [...ACCOUNTED_FOR_STATUSES]] }, 1, 0] },
        },
      },
    },
  ]);
  const byMonth = new Map(buckets.map((b) => [b._id, b.accounted]));
  const holidayDates = await getHolidayDatesInRange(rangeStart, rangeEnd);

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const month = monthKey(monthStart);
    const workingDays = countBusinessDays(monthStart, monthEnd, holidayDates);
    const expected = workingDays * employeeIds.length;
    const accounted = byMonth.get(month) ?? 0;
    const absenceCount = Math.max(0, expected - accounted);

    history.push({
      month,
      absenteeismRate: expected === 0 ? 0 : round2((absenceCount / expected) * 100),
    });
  }

  return history;
}

const IMPOSSIBLE_SPEED_KMH = 200;
const DUPLICATE_FACE_SIMILARITY_THRESHOLD = 0.92;
const OVERTIME_OUTLIER_Z_SCORE = 2;

async function detectLocationAnomalies(days: number): Promise<AnomalyDTO[]> {
  const end = startOfUtcDay(new Date());
  const start = new Date(end.getTime() - (days - 1) * MS_PER_DAY);

  const records = await Attendance.find({
    method: 'gps',
    date: { $gte: start, $lte: end },
    checkInAt: { $ne: null },
  })
    .select('employeeId date checkInAt checkOutAt checkInLocation checkOutLocation')
    .sort({ employeeId: 1, date: 1 });

  const byEmployee = new Map<string, IAttendance[]>();
  for (const record of records) {
    const key = String(record.employeeId);
    const list = byEmployee.get(key);
    if (list) list.push(record);
    else byEmployee.set(key, [record]);
  }
  if (byEmployee.size === 0) return [];

  const employees = await Employee.find({ _id: { $in: [...byEmployee.keys()] } }).select(
    'firstName lastName',
  );
  const nameById = new Map(employees.map((e) => [String(e._id), `${e.firstName} ${e.lastName}`]));

  const anomalies: AnomalyDTO[] = [];
  for (const [employeeId, empRecords] of byEmployee) {
    for (let i = 1; i < empRecords.length; i += 1) {
      const prev = empRecords[i - 1];
      const curr = empRecords[i];
      const prevLocation = prev.checkOutLocation ?? prev.checkInLocation;
      const prevTime = prev.checkOutAt ?? prev.checkInAt;
      const currLocation = curr.checkInLocation;
      const currTime = curr.checkInAt;
      if (!prevLocation || !currLocation || !prevTime || !currTime) continue;

      const hours = (currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);
      if (hours <= 0) continue;

      const distanceKm = haversineDistanceKm(prevLocation, currLocation);
      const impliedSpeedKmh = distanceKm / hours;
      if (impliedSpeedKmh <= IMPOSSIBLE_SPEED_KMH) continue;

      anomalies.push({
        type: 'location_anomaly',
        severity: impliedSpeedKmh > IMPOSSIBLE_SPEED_KMH * 2 ? 'high' : 'medium',
        employeeId,
        employeeName: nameById.get(employeeId) ?? 'Unknown',
        detail: `Implied travel speed of ${Math.round(impliedSpeedKmh)} km/h between two GPS punches ${distanceKm.toFixed(1)} km apart, ${hours.toFixed(1)}h between them (${prevTime.toISOString()} → ${currTime.toISOString()}).`,
        detectedAt: currTime,
      });
    }
  }

  return anomalies;
}

function duplicateFaceCaveat(vectorLength: number): string {
  if (vectorLength === 512) {
    return 'Both embeddings are from the real MobileFaceNet model (faceEmbedding.provider.ts) — a high score here is a genuine facial-similarity signal, not confirmed shared identity on its own.';
  }
  if (vectorLength === 67) {
    return "Both embeddings are mobile's on-device geometric placeholder (features/face/domain/embedding/geometric_embedding_generator.dart), not a trained facial model — a match here means similar face-landmark geometry, not confirmed shared identity.";
  }
  return "Both embeddings predate the real MobileFaceNet model — faceEmbedding.provider.ts's earlier placeholder hashed image bytes rather than running a trained facial model, so a match here means two similar-looking source photos, not confirmed shared identity.";
}

async function detectDuplicateFaces(): Promise<AnomalyDTO[]> {
  const embeddings = await FaceEmbedding.find({ isActive: true }).select('employeeId vector');
  if (embeddings.length < 2) return [];

  const employeeIds = [...new Set(embeddings.map((e) => String(e.employeeId)))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).select('firstName lastName');
  const nameById = new Map(employees.map((e) => [String(e._id), `${e.firstName} ${e.lastName}`]));

  const anomalies: AnomalyDTO[] = [];
  const flaggedPairs = new Set<string>();

  for (let i = 0; i < embeddings.length; i += 1) {
    for (let j = i + 1; j < embeddings.length; j += 1) {
      const a = embeddings[i];
      const b = embeddings[j];
      const employeeIdA = String(a.employeeId);
      const employeeIdB = String(b.employeeId);
      if (employeeIdA === employeeIdB) continue;

      const pairKey = [employeeIdA, employeeIdB].sort().join(':');
      if (flaggedPairs.has(pairKey)) continue;

      if (a.vector.length !== b.vector.length) continue;

      const similarity = cosineSimilarity(a.vector, b.vector);
      if (similarity < DUPLICATE_FACE_SIMILARITY_THRESHOLD) continue;
      flaggedPairs.add(pairKey);

      anomalies.push({
        type: 'duplicate_face',
        severity: similarity > 0.97 ? 'high' : 'medium',
        employeeId: employeeIdA,
        employeeName: nameById.get(employeeIdA) ?? 'Unknown',
        relatedEmployeeId: employeeIdB,
        relatedEmployeeName: nameById.get(employeeIdB) ?? 'Unknown',
        detail: `Face embeddings ${(similarity * 100).toFixed(1)}% similar across two different employee profiles — review for a possible duplicate registration. ${duplicateFaceCaveat(a.vector.length)}`,
        detectedAt: new Date(),
      });
    }
  }

  return anomalies;
}

async function detectOvertimeOutliers(days: number): Promise<AnomalyDTO[]> {
  const end = startOfUtcDay(new Date());
  const start = new Date(end.getTime() - (days - 1) * MS_PER_DAY);

  const totals = await Attendance.aggregate<{ _id: Types.ObjectId; totalOvertimeMinutes: number }>([
    { $match: { date: { $gte: start, $lte: end }, overtimeMinutes: { $gt: 0 } } },
    { $group: { _id: '$employeeId', totalOvertimeMinutes: { $sum: '$overtimeMinutes' } } },
  ]);
  if (totals.length < 4) return [];

  const values = totals.map((t) => t.totalOvertimeMinutes);
  const n = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const sumSq = values.reduce((s, v) => s + v * v, 0);

  const employeeIds = totals.map((t) => String(t._id));
  const employees = await Employee.find({ _id: { $in: employeeIds } }).select('firstName lastName');
  const nameById = new Map(employees.map((e) => [String(e._id), `${e.firstName} ${e.lastName}`]));

  const anomalies: AnomalyDTO[] = [];
  for (let i = 0; i < n; i += 1) {
    const value = values[i];
    const othersN = n - 1;
    const othersMean = (sum - value) / othersN;
    const othersVariance = (sumSq - value * value) / othersN - othersMean ** 2;
    const othersStdDev = Math.sqrt(Math.max(0, othersVariance));
    if (othersStdDev === 0) continue;

    const zScore = (value - othersMean) / othersStdDev;
    if (zScore <= OVERTIME_OUTLIER_Z_SCORE) continue;

    const employeeId = String(totals[i]._id);
    anomalies.push({
      type: 'overtime_outlier',
      severity: zScore > OVERTIME_OUTLIER_Z_SCORE * 1.5 ? 'high' : 'medium',
      employeeId,
      employeeName: nameById.get(employeeId) ?? 'Unknown',
      detail: `${Math.round(value / 60)}h of overtime in the last ${days} days — ${zScore.toFixed(1)} standard deviations above the ${Math.round(othersMean / 60)}h average of everyone else with overtime this window.`,
      detectedAt: new Date(),
    });
  }

  return anomalies;
}

const MIN_EMPLOYEES_FOR_PATTERN_ANALYSIS = 5;
const ATTENDANCE_PATTERN_ANOMALY_SCORE = 0.65;

interface AttendanceFeatureRow {
  _id: Types.ObjectId;
  avgCheckInMinute: number;
  stdDevCheckInMinute: number | null;
  lateCount: number;
  totalDays: number;
  avgOvertimeMinutes: number;
}

async function detectAttendancePatternAnomalies(days: number): Promise<AnomalyDTO[]> {
  const end = startOfUtcDay(new Date());
  const start = new Date(end.getTime() - (days - 1) * MS_PER_DAY);

  const rows = await Attendance.aggregate<AttendanceFeatureRow>([
    { $match: { date: { $gte: start, $lte: end }, checkInAt: { $ne: null } } },
    {
      $project: {
        employeeId: 1,
        status: 1,
        overtimeMinutes: 1,
        checkInMinuteOfDay: {
          $add: [{ $multiply: [{ $hour: '$checkInAt' }, 60] }, { $minute: '$checkInAt' }],
        },
      },
    },
    {
      $group: {
        _id: '$employeeId',
        avgCheckInMinute: { $avg: '$checkInMinuteOfDay' },
        stdDevCheckInMinute: { $stdDevPop: '$checkInMinuteOfDay' },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        totalDays: { $sum: 1 },
        avgOvertimeMinutes: { $avg: { $ifNull: ['$overtimeMinutes', 0] } },
      },
    },
  ]);

  if (rows.length < MIN_EMPLOYEES_FOR_PATTERN_ANALYSIS) return [];

  const features = rows.map((r) => [
    r.avgCheckInMinute,
    r.stdDevCheckInMinute ?? 0,
    r.lateCount / r.totalDays,
    r.avgOvertimeMinutes,
  ]);

  const forest = new IsolationForest(features);

  const employeeIds = rows.map((r) => String(r._id));
  const employees = await Employee.find({ _id: { $in: employeeIds } }).select('firstName lastName');
  const nameById = new Map(employees.map((e) => [String(e._id), `${e.firstName} ${e.lastName}`]));

  const anomalies: AnomalyDTO[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const score = forest.anomalyScore(features[i]);
    if (score < ATTENDANCE_PATTERN_ANOMALY_SCORE) continue;

    const employeeId = String(rows[i]._id);
    const row = rows[i];
    anomalies.push({
      type: 'attendance_pattern_anomaly',
      severity: score > 0.8 ? 'high' : 'medium',
      employeeId,
      employeeName: nameById.get(employeeId) ?? 'Unknown',
      detail: `Attendance pattern flagged by an isolation-forest anomaly score of ${score.toFixed(2)} (0.5 = unremarkable, 1.0 = maximally isolated) over the last ${days} days — avg check-in ${formatMinuteOfDay(row.avgCheckInMinute)}, ${row.lateCount}/${row.totalDays} days late, ${Math.round(row.avgOvertimeMinutes)}min avg overtime, relative to every other employee's own pattern in the same window.`,
      detectedAt: new Date(),
    });
  }

  return anomalies;
}

function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = Math.round(minute % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const aiAnalyticsService = {
  async getLateRiskEmployees(
    actor: ActorContext,
    query: LateRiskQuery,
  ): Promise<LateRiskEmployeeDTO[]> {
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    if (employeeIds.length === 0) return [];

    const end = startOfUtcDay(new Date());
    const start = new Date(end.getTime() - (query.days - 1) * MS_PER_DAY);
    const halfDays = Math.floor(query.days / 2);
    const midpoint = new Date(start.getTime() + halfDays * MS_PER_DAY);
    const firstHalfEnd = new Date(midpoint.getTime() - MS_PER_DAY);

    const holidayDates = await getHolidayDatesInRange(start, end);
    const workingDaysFirstHalf = countBusinessDays(start, firstHalfEnd, holidayDates);
    const workingDaysSecondHalf = countBusinessDays(midpoint, end, holidayDates);
    const workingDays = workingDaysFirstHalf + workingDaysSecondHalf;
    if (workingDays === 0) return [];

    const objectIds = employeeIds.map((id) => new Types.ObjectId(id));
    const buckets = await Attendance.aggregate<{
      _id: Types.ObjectId;
      lateFirstHalf: number;
      lateSecondHalf: number;
    }>([
      {
        $match: {
          employeeId: { $in: objectIds },
          date: { $gte: start, $lte: end },
          status: 'late',
        },
      },
      {
        $group: {
          _id: '$employeeId',
          lateFirstHalf: { $sum: { $cond: [{ $lt: ['$date', midpoint] }, 1, 0] } },
          lateSecondHalf: { $sum: { $cond: [{ $gte: ['$date', midpoint] }, 1, 0] } },
        },
      },
    ]);
    const byEmployee = new Map(buckets.map((b) => [String(b._id), b]));

    const employees = await Employee.find({ _id: { $in: employeeIds } }).select(
      'employeeCode firstName lastName',
    );

    const results: LateRiskEmployeeDTO[] = employees.map((employee) => {
      const employeeId = String(employee._id);
      const bucket = byEmployee.get(employeeId);
      const lateFirstHalf = bucket?.lateFirstHalf ?? 0;
      const lateSecondHalf = bucket?.lateSecondHalf ?? 0;
      const lateDays = lateFirstHalf + lateSecondHalf;
      const lateRate = round2((lateDays / workingDays) * 100);

      const firstHalfRate = workingDaysFirstHalf === 0 ? 0 : lateFirstHalf / workingDaysFirstHalf;
      const secondHalfRate =
        workingDaysSecondHalf === 0 ? 0 : lateSecondHalf / workingDaysSecondHalf;
      let trend: RiskTrend = 'stable';
      if (secondHalfRate > firstHalfRate + 0.05) trend = 'increasing';
      else if (secondHalfRate < firstHalfRate - 0.05) trend = 'decreasing';

      const trendAdjustment = trend === 'increasing' ? 10 : trend === 'decreasing' ? -10 : 0;
      const riskScore = Math.max(0, Math.min(100, round2(lateRate + trendAdjustment)));

      return {
        employeeId,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        riskScore,
        lateDays,
        workingDays,
        lateRate,
        trend,
      };
    });

    return results.sort((a, b) => b.riskScore - a.riskScore).slice(0, query.limit);
  },

  async getAbsenteeismTrend(
    actor: ActorContext,
    query: AbsenteeismTrendQuery,
  ): Promise<AbsenteeismForecastDTO> {
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    const months = query.months;
    const now = new Date();

    const history = await computeAbsenteeismHistory(employeeIds, months);
    const values = history.map((h) => h.absenteeismRate);
    const fit = fitLinearRegression(values);

    const forecastRate = round2(predictAt(fit, values.length));
    const forecastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const confidenceIntervalPp = round2(1.96 * residualStdError(values, fit));
    const backtestMaePp = backtestMae(values);

    // Department breakdown and drivers are workspace-wide context, so they
    // only apply to the unscoped view — a single department (or a manager,
    // scoped to their own team) already sees exactly one row's worth.
    let departmentBreakdown: DepartmentAbsenteeismRowDTO[] = [];
    let drivers: AbsenteeismDriverDTO[] = [];

    if (!query.departmentId && actor.role !== 'manager') {
      const departments = await Department.find({ isActive: true }).select('name');
      const rows = await Promise.all(
        departments.map(async (dept) => {
          const deptEmployeeIds = await resolveEmployeeIds(actor, String(dept._id));
          if (deptEmployeeIds.length === 0) return null;

          const deptHistory = await computeAbsenteeismHistory(deptEmployeeIds, months);
          const deptValues = deptHistory.map((h) => h.absenteeismRate);
          const deptFit = fitLinearRegression(deptValues);
          const lastObservedRate = deptValues[deptValues.length - 1] ?? 0;
          const previousObservedRate = deptValues[deptValues.length - 2] ?? lastObservedRate;
          const projectedRate = round2(predictAt(deptFit, deptValues.length));
          const deltaPp = round2(projectedRate - lastObservedRate);
          const risk: DepartmentAbsenteeismRowDTO['risk'] =
            projectedRate >= 8 ? 'high' : projectedRate >= 5 ? 'medium' : 'low';

          return {
            departmentId: String(dept._id),
            departmentName: dept.name,
            lastObservedRate,
            previousObservedRate,
            projectedRate,
            deltaPp,
            risk,
            headcount: deptEmployeeIds.length,
          };
        }),
      );
      const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);
      departmentBreakdown = validRows.map(
        ({ previousObservedRate: _prev, headcount: _hc, ...row }) => row,
      );

      // Real decomposition, not a narrative cause: each department's own
      // observed month-over-month change, weighted by its share of
      // headcount — these weighted deltas sum to (approximately) the
      // workspace-wide step between the same two months.
      const totalHeadcount = validRows.reduce((sum, row) => sum + row.headcount, 0);
      if (totalHeadcount > 0) {
        drivers = validRows
          .map((row) => ({
            label: row.departmentName,
            valuePp: round2(
              (row.lastObservedRate - row.previousObservedRate) * (row.headcount / totalHeadcount),
            ),
          }))
          .filter((driver) => driver.valuePp !== 0)
          .sort((a, b) => Math.abs(b.valuePp) - Math.abs(a.valuePp))
          .slice(0, 5);
      }
    }

    return {
      history,
      forecastMonth: monthKey(forecastMonthDate),
      forecastRate,
      confidenceIntervalPp,
      trendPpPerMonth: round2(fit.slope),
      rSquared: round2(fit.rSquared),
      backtestMaePp,
      drivers,
      departmentBreakdown,
      method: 'linear-regression',
    };
  },

  async getAnomalies(query: AnomaliesQuery): Promise<AnomalyDTO[]> {
    const [locationAnomalies, duplicateFaces, overtimeOutliers, attendancePatternAnomalies] =
      await Promise.all([
        detectLocationAnomalies(query.days),
        detectDuplicateFaces(),
        detectOvertimeOutliers(query.days),
        detectAttendancePatternAnomalies(query.days),
      ]);
    return [
      ...locationAnomalies,
      ...duplicateFaces,
      ...overtimeOutliers,
      ...attendancePatternAnomalies,
    ];
  },
};
