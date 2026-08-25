import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z
    .object({
      attendanceRules: z
        .object({
          lateGraceMinutes: z.number().int().min(0).max(120),
          autoMarkAbsentEnabled: z.boolean(),
          requireGeofenceForGps: z.boolean(),
          allowManualCheckIn: z.boolean(),
        })
        .partial(),
      leaveApprovals: z
        .object({
          autoApproveUnderDays: z.number().int().min(0).max(30),
          requireManagerApproval: z.boolean(),
          carryForwardEnabled: z.boolean(),
        })
        .partial(),
      aiAnalytics: z
        .object({
          anomalyDetectionEnabled: z.boolean(),
          absenteeismForecastingEnabled: z.boolean(),
          lateRiskAlertsEnabled: z.boolean(),
        })
        .partial(),
      dataPayroll: z
        .object({
          payrollCutoffDay: z.number().int().min(1).max(28),
          dataRetentionMonths: z.number().int().min(1),
          weeklyDigestEmail: z.boolean(),
        })
        .partial(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update.' }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
