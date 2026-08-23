import { type Document, Schema, type Types, model } from 'mongoose';

export const ATTENDANCE_METHODS = ['gps', 'qr', 'face', 'manual'] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];

export const ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'absent', 'on_leave'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const SYNC_STATUSES = ['synced', 'pending', 'conflict'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const CORRECTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

interface BreakWindow {
  start: Date;
  end?: Date | null;
}

export interface CorrectionRequest {
  requestedCheckInAt?: Date | null;
  requestedCheckOutAt?: Date | null;
  reason: string;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  status: CorrectionStatus;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewComment?: string;
}

export interface IAttendance extends Document {
  employeeId: Types.ObjectId;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breaks: BreakWindow[];
  method: AttendanceMethod;
  checkInLocation?: GeoPoint;
  checkOutLocation?: GeoPoint;
  geofenceId: Types.ObjectId | null;
  qrCodeId: Types.ObjectId | null;
  faceMatchConfidence: number | null;
  workingMinutes: number;
  status: AttendanceStatus;
  isOvertime: boolean;
  overtimeMinutes: number;
  isCorrected: boolean;
  correctedBy: Types.ObjectId | null;
  correctionReason?: string;
  correctionRequest: CorrectionRequest | null;
  syncStatus: SyncStatus;
  clientGeneratedId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const geoPointSchema = new Schema<GeoPoint>(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracyMeters: Number,
  },
  { _id: false },
);

const breakWindowSchema = new Schema<BreakWindow>(
  {
    start: { type: Date, required: true },
    end: { type: Date, default: null },
  },
  { _id: false },
);

const correctionRequestSchema = new Schema<CorrectionRequest>(
  {
    requestedCheckInAt: { type: Date, default: null },
    requestedCheckOutAt: { type: Date, default: null },
    reason: { type: String, required: true, maxlength: 500 },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: CORRECTION_STATUSES, default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedAt: { type: Date, default: null },
    reviewComment: String,
  },
  { _id: false },
);

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true },
    checkInAt: { type: Date, default: null },
    checkOutAt: {
      type: Date,
      default: null,
      validate: {
        validator: function checkOutAfterCheckIn(this: IAttendance, value: Date | null) {
          if (!value || !this.checkInAt) return true;
          return value.getTime() > this.checkInAt.getTime();
        },
        message: 'checkOutAt must be after checkInAt.',
      },
    },
    breaks: { type: [breakWindowSchema], default: [] },
    method: { type: String, enum: ATTENDANCE_METHODS, required: true },
    checkInLocation: { type: geoPointSchema, default: undefined },
    checkOutLocation: { type: geoPointSchema, default: undefined },
    geofenceId: { type: Schema.Types.ObjectId, ref: 'Geofence', default: null },
    qrCodeId: { type: Schema.Types.ObjectId, ref: 'QRCode', default: null },
    faceMatchConfidence: { type: Number, min: 0, max: 1, default: null },
    workingMinutes: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'present', index: true },
    isOvertime: { type: Boolean, default: false },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    isCorrected: { type: Boolean, default: false },
    correctedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    correctionReason: String,
    correctionRequest: { type: correctionRequestSchema, default: null },
    syncStatus: { type: String, enum: SYNC_STATUSES, default: 'synced' },
    clientGeneratedId: { type: String, default: undefined },
  },
  { timestamps: true },
);

attendanceSchema.pre('validate', function enforceMethodEvidence(next) {
  if (this.checkInAt) {
    if (this.method === 'gps' && !this.checkInLocation) {
      this.invalidate('checkInLocation', 'GPS check-in requires a location.');
    }
    if (this.method === 'qr' && !this.qrCodeId) {
      this.invalidate('qrCodeId', 'QR check-in requires a qrCodeId.');
    }
    if (this.method === 'face' && this.faceMatchConfidence == null) {
      this.invalidate('faceMatchConfidence', 'Face check-in requires a match confidence score.');
    }
  }
  next();
});

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ clientGeneratedId: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ method: 1, date: 1 });
attendanceSchema.index({ date: 1, overtimeMinutes: 1 });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
