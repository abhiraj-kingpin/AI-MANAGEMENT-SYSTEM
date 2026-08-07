export type RiskTrend = 'increasing' | 'decreasing' | 'stable';

export interface LateRiskEmployeeDTO {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  riskScore: number; // 0-100, higher = more likely to be late again soon
  lateDays: number;
  workingDays: number;
  lateRate: number; // % of working days late over the query window
  trend: RiskTrend; // second half of the window vs the first half
}

export interface AbsenteeismTrendPointDTO {
  month: string; // "YYYY-MM"
  absenteeismRate: number; // % of expected employee-days with no attendance signal at all
}

export interface AbsenteeismForecastDTO {
  history: AbsenteeismTrendPointDTO[];
  forecastMonth: string;
  forecastRate: number;
  // Stated plainly: a least-squares trend line over `history`, not a
  // trained model — see analytics.ai.service.ts#linearRegressionForecast.
  method: 'linear-regression';
}

export type AnomalyType = 'location_anomaly' | 'duplicate_face' | 'overtime_outlier';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyDTO {
  type: AnomalyType;
  severity: AnomalySeverity;
  employeeId: string;
  employeeName: string;
  relatedEmployeeId?: string;
  relatedEmployeeName?: string;
  detail: string; // human-readable explanation carrying the real numbers behind the flag
  detectedAt: Date;
}
