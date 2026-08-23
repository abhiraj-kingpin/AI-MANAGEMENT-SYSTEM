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

export interface AbsenteeismForecastDTO {
  history: AbsenteeismTrendPointDTO[];
  forecastMonth: string;
  forecastRate: number;
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
