export type RiskTrend = 'increasing' | 'decreasing' | 'stable';

export interface LateRiskEmployeeDTO {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  riskScore: number;
  lateDays: number;
  workingDays: number;
  lateRate: number;
  trend: RiskTrend;
}

export interface AbsenteeismTrendPointDTO {
  month: string;
  absenteeismRate: number;
}

export interface AbsenteeismDriverDTO {
  label: string;
  valuePp: number;
}

export interface DepartmentAbsenteeismRowDTO {
  departmentId: string;
  departmentName: string;
  lastObservedRate: number;
  projectedRate: number;
  deltaPp: number;
  risk: 'low' | 'medium' | 'high';
}

export interface AbsenteeismForecastDTO {
  history: AbsenteeismTrendPointDTO[];
  forecastMonth: string;
  forecastRate: number;
  // ± half-width of the 95% prediction interval around forecastRate — the
  // interval widens for anything further out (see forecastAtHorizon).
  confidenceIntervalPp: number;
  // Regression slope, in absenteeism percentage points per month.
  trendPpPerMonth: number;
  // Coefficient of determination of the fitted line against history — 1.0
  // is a perfect fit, not a claim of predictive accuracy.
  rSquared: number;
  // Mean absolute error refitting on all-but-the-last-3 months and scoring
  // against those 3 held-out months — 0 (or null, too little history)
  // when there isn't enough history for a 3-month holdout.
  backtestMaePp: number | null;
  // A decomposition of the step from the last two observed months,
  // computed from real per-department deltas (headcount-weighted) — not a
  // narrative cause. Departments with 0 pp contribution are omitted.
  drivers: AbsenteeismDriverDTO[];
  departmentBreakdown: DepartmentAbsenteeismRowDTO[];
  method: 'linear-regression';
}

export type AnomalyType =
  'location_anomaly' | 'duplicate_face' | 'overtime_outlier' | 'attendance_pattern_anomaly';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyDTO {
  type: AnomalyType;
  severity: AnomalySeverity;
  employeeId: string;
  employeeName: string;
  relatedEmployeeId?: string;
  relatedEmployeeName?: string;
  detail: string;
  detectedAt: Date;
}
