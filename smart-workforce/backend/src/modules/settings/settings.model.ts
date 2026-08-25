import { type Document, Schema, type Types, model } from 'mongoose';

// A single row, upserted in place (see settings.service.ts) — the app has
// exactly one workspace, so there's exactly one settings document rather
// than a keyed table.
export interface IWorkspaceSettings extends Document {
  attendanceRules: {
    lateGraceMinutes: number;
    autoMarkAbsentEnabled: boolean;
    requireGeofenceForGps: boolean;
    allowManualCheckIn: boolean;
  };
  leaveApprovals: {
    autoApproveUnderDays: number;
    requireManagerApproval: boolean;
    carryForwardEnabled: boolean;
  };
  aiAnalytics: {
    anomalyDetectionEnabled: boolean;
    absenteeismForecastingEnabled: boolean;
    lateRiskAlertsEnabled: boolean;
  };
  dataPayroll: {
    payrollCutoffDay: number;
    dataRetentionMonths: number;
    weeklyDigestEmail: boolean;
  };
  updatedAt: Date;
  updatedBy: Types.ObjectId | null;
}

const workspaceSettingsSchema = new Schema<IWorkspaceSettings>(
  {
    attendanceRules: {
      lateGraceMinutes: { type: Number, default: 10, min: 0, max: 120 },
      autoMarkAbsentEnabled: { type: Boolean, default: true },
      requireGeofenceForGps: { type: Boolean, default: true },
      allowManualCheckIn: { type: Boolean, default: true },
    },
    leaveApprovals: {
      autoApproveUnderDays: { type: Number, default: 0, min: 0, max: 30 },
      requireManagerApproval: { type: Boolean, default: true },
      carryForwardEnabled: { type: Boolean, default: true },
    },
    aiAnalytics: {
      anomalyDetectionEnabled: { type: Boolean, default: true },
      absenteeismForecastingEnabled: { type: Boolean, default: true },
      lateRiskAlertsEnabled: { type: Boolean, default: true },
    },
    dataPayroll: {
      payrollCutoffDay: { type: Number, default: 24, min: 1, max: 28 },
      dataRetentionMonths: { type: Number, default: 84, min: 1 },
      weeklyDigestEmail: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const WorkspaceSettings = model<IWorkspaceSettings>(
  'WorkspaceSettings',
  workspaceSettingsSchema,
);
