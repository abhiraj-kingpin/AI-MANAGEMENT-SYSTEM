import { Types } from 'mongoose';
import type { ActorContext } from '../../shared/types/actorContext';
import { countBusinessDays } from '../../shared/utils/businessDays';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { haversineDistanceKm } from '../../shared/utils/geo';
import { round2 } from '../../shared/utils/math';
import { cosineSimilarity } from '../../shared/utils/vectorMath';
import { Attendance, type IAttendance } from '../attendance/attendance.model';
import { Employee } from '../employees/employee.model';
import { FaceEmbedding } from '../face-recognition/faceEmbedding.model';
import { getHolidayDatesInRange } from '../leaves/holiday.service';
import { resolveEmployeeIds } from './analytics.service';
import type {
  AbsenteeismForecastDTO,
  AnomalyDTO,
  LateRiskEmployeeDTO,
  RiskTrend,
} from './analytics.ai.types';
import type {
  AbsenteeismTrendQuery,
  AnomaliesQuery,
  LateRiskQuery,
} from './analytics.ai.validators';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A day counts as "accounted for" if the employee showed up in some form
// (on time, late, half a day) or was on approved leave. Everything else —
// including the schema's own 'absent' status, which nothing currently
// writes (see payslip.service.ts's documented gap) — falls through as
// absenteeism. This is the same PRESENT_STATUSES-adjacent idea
// analytics.service.ts uses, just widened to include 'on_leave' as
// "accounted for" rather than "worked".
const ACCOUNTED_FOR_STATUSES = new Set(['present', 'late', 'half_day', 'on_leave']);

/** Least-squares trend line over `values` (x = 0..n-1), forecasting one step past the end, clamped to a 0-100 rate. Named plainly in the DTO as 'linear-regression' — a transparent, real computation, not a trained model. */
function linearRegressionForecast(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  if (n === 1) return round2(values[0]);

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
  const forecast = intercept + slope * n;
  return round2(Math.max(0, Math.min(100, forecast)));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Speed a check-out-here/check-in-there pair would imply if it were real travel — far beyond any plausible commute, so anything above it is flagged rather than silently trusted. */
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
      if (employeeIdA === employeeIdB) continue; // same person's own multiple registrations — not a duplicate-identity concern

      const pairKey = [employeeIdA, employeeIdB].sort().join(':');
      if (flaggedPairs.has(pairKey)) continue;

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
        detail: `Face embeddings ${(similarity * 100).toFixed(1)}% similar across two different employee profiles — review for a possible duplicate registration. Note: faceEmbedding.provider.ts's documented placeholder hashes image bytes rather than running a trained facial model, so a match here means two similar-looking source photos, not confirmed shared identity.`,
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
  // A "leave-one-out" z-score — each employee is scored against the
  // mean/stddev of *everyone else*, not the whole group including
  // themselves. Scoring against a self-inclusive baseline mathematically
  // caps the highest possible z-score at sqrt(n-1) (a lone outlier drags
  // its own mean/stddev up enough to partly hide itself), which silently
  // suppresses exactly the case this check exists to catch. Needs at least
  // 4 samples so the 3-person "everyone else" baseline means something.
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
    if (othersStdDev === 0) continue; // everyone else logged identical overtime — no baseline to compare against

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

export const aiAnalyticsService = {
  /**
   * Ranks the caller's in-scope employees by a real, explainable "late
   * risk" score: their late-arrival rate over the trailing `days`, nudged
   * up or down depending on whether the second half of that window is
   * worse or better than the first. This is rule-based statistics, not a
   * trained model — the score is fully reconstructible from `lateDays`,
   * `workingDays`, and `trend` in the same response.
   */
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

  /**
   * Monthly absenteeism rate for the trailing `months`, plus a one-month-
   * ahead forecast from a least-squares trend line. "Absenteeism" here
   * means an expected working day with no attendance signal at all
   * (nobody checked in, and no approved leave covers it) — not just the
   * schema's `absent` status, which nothing currently writes (see
   * payslip.service.ts's documented gap); a day with no record is exactly
   * the case this is meant to catch regardless.
   */
  async getAbsenteeismTrend(
    actor: ActorContext,
    query: AbsenteeismTrendQuery,
  ): Promise<AbsenteeismForecastDTO> {
    const employeeIds = await resolveEmployeeIds(actor, query.departmentId);
    const headcount = employeeIds.length;
    const months = query.months;
    const now = new Date();

    const history = [];
    if (headcount > 0) {
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
        const monthEnd = new Date(
          Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
        );
        const month = monthKey(monthStart);
        const workingDays = countBusinessDays(monthStart, monthEnd, holidayDates);
        const expected = workingDays * headcount;
        const accounted = byMonth.get(month) ?? 0;
        const absenceCount = Math.max(0, expected - accounted);

        history.push({
          month,
          absenteeismRate: expected === 0 ? 0 : round2((absenceCount / expected) * 100),
        });
      }
    } else {
      for (let i = months - 1; i >= 0; i -= 1) {
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        history.push({ month: monthKey(monthStart), absenteeismRate: 0 });
      }
    }

    const forecastRate = linearRegressionForecast(history.map((h) => h.absenteeismRate));
    const forecastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    return {
      history,
      forecastMonth: monthKey(forecastMonthDate),
      forecastRate,
      method: 'linear-regression',
    };
  },

  /**
   * Org-wide (HR/Admin only, gated at the route) rule-based anomaly sweep —
   * three independent, fully-explainable checks, not a black-box model:
   * implausible GPS travel between consecutive punches, suspiciously
   * similar face embeddings across two different employees, and
   * statistically outlying overtime totals (z-score against the org's own
   * mean/stddev for the same window).
   */
  async getAnomalies(query: AnomaliesQuery): Promise<AnomalyDTO[]> {
    const [locationAnomalies, duplicateFaces, overtimeOutliers] = await Promise.all([
      detectLocationAnomalies(query.days),
      detectDuplicateFaces(),
      detectOvertimeOutliers(query.days),
    ]);
    return [...locationAnomalies, ...duplicateFaces, ...overtimeOutliers];
  },
};
