import { z } from 'zod';
import { objectIdString } from '../../shared/validators/objectId';
import { ATTENDANCE_METHODS, ATTENDANCE_STATUSES } from './attendance.model';

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).optional(),
});

export const checkInSchema = z.object({
  body: z
    .object({
      method: z.enum(ATTENDANCE_METHODS),
      location: geoPointSchema.optional(),
      qrToken: z.string().optional(),
      faceEmbedding: z.array(z.number()).min(64).max(1024).optional(),
      livenessPassed: z.boolean().optional(),
    })
    .superRefine((body, ctx) => {
      if ((body.method === 'gps' || body.method === 'face') && !body.location) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['location'],
          message: `${body.method === 'gps' ? 'GPS' : 'Face'} check-in requires a location.`,
        });
      }
      if (body.method === 'qr' && !body.qrToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['qrToken'],
          message: 'QR check-in requires a token.',
        });
      }
      if (body.method === 'face' && !body.faceEmbedding) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['faceEmbedding'],
          message: 'Face check-in requires an embedding.',
        });
      }
    }),
});

export const checkOutSchema = z.object({
  body: z.object({
    location: geoPointSchema.optional(),
  }),
});

export const listAttendanceQuerySchema = z.object({
  query: z.object({
    employeeId: objectIdString.optional(),
    departmentId: objectIdString.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.enum(ATTENDANCE_STATUSES).optional(),
    // Powers the Attendance corrections queue — records with an
    // open, not-yet-reviewed correction request, across every employee.
    hasPendingCorrection: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

// "Add missing attendance" — HR/Admin backfilling a day with no punch at
// all (unlike /:id/correct, which edits a record that already exists).
export const manualAttendanceSchema = z.object({
  body: z
    .object({
      employeeId: objectIdString,
      date: z.coerce.date(),
      checkInAt: z.coerce.date().optional(),
      checkOutAt: z.coerce.date().optional(),
      status: z.enum(ATTENDANCE_STATUSES),
      reason: z.string().trim().min(1, 'A reason is required for a manual entry.'),
    })
    .refine((body) => !body.checkOutAt || !body.checkInAt || body.checkOutAt >= body.checkInAt, {
      message: 'checkOutAt must be on or after checkInAt.',
      path: ['checkOutAt'],
    }),
});

export const myAttendanceQuerySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const correctAttendanceSchema = z.object({
  body: z
    .object({
      checkInAt: z.coerce.date().optional(),
      checkOutAt: z.coerce.date().optional(),
      status: z.enum(ATTENDANCE_STATUSES).optional(),
      reason: z.string().trim().min(1, 'A reason is required for manual corrections.'),
    })
    .refine((body) => body.checkInAt || body.checkOutAt || body.status, {
      message: 'Provide at least one of checkInAt, checkOutAt, or status to correct.',
    }),
});

export const requestCorrectionSchema = z.object({
  body: z
    .object({
      requestedCheckInAt: z.coerce.date().optional(),
      requestedCheckOutAt: z.coerce.date().optional(),
      reason: z.string().trim().min(1, 'A reason is required.'),
    })
    .refine((body) => body.requestedCheckInAt || body.requestedCheckOutAt, {
      message: 'Provide at least one of requestedCheckInAt or requestedCheckOutAt.',
    }),
});

export const reviewCorrectionSchema = z.object({
  body: z.object({
    comment: z.string().trim().max(500).optional(),
  }),
});

const syncPunchSchema = z
  .object({
    clientGeneratedId: z.string().trim().min(1),
    type: z.enum(['check_in', 'check_out']),
    method: z.enum(ATTENDANCE_METHODS).optional(),
    location: geoPointSchema.optional(),
    qrToken: z.string().optional(),
    faceEmbedding: z.array(z.number()).min(64).max(1024).optional(),
    livenessPassed: z.boolean().optional(),
    occurredAt: z.coerce.date(),
  })
  .superRefine((punch, ctx) => {
    if (punch.type === 'check_in' && !punch.method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['method'],
        message: 'check_in punches require a method.',
      });
    }
  });

export const syncAttendanceSchema = z.object({
  body: z.object({
    punches: z.array(syncPunchSchema).min(1).max(100),
  }),
});

export const absenceSweepSchema = z.object({
  body: z.object({
    date: z.coerce.date().optional(),
  }),
});

export type GeoPointInput = z.infer<typeof geoPointSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>['body'];
export type CheckOutInput = z.infer<typeof checkOutSchema>['body'];
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>['query'];
export type MyAttendanceQuery = z.infer<typeof myAttendanceQuerySchema>['query'];
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>['body'];
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>['body'];
export type RequestCorrectionInput = z.infer<typeof requestCorrectionSchema>['body'];
export type SyncPunchInput = z.infer<typeof syncPunchSchema>;
export type SyncAttendanceInput = z.infer<typeof syncAttendanceSchema>['body'];
export type AbsenceSweepInput = z.infer<typeof absenceSweepSchema>['body'];
