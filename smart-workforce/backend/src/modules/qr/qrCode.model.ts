import { type Document, Schema, type Types, model } from 'mongoose';

interface QrUsage {
  employeeId: Types.ObjectId;
  usedAt: Date;
}

export interface IQrCode extends Document {
  geofenceId: Types.ObjectId;
  token: string;
  validFrom: Date;
  validTo: Date;
  isUsed: boolean;
  usedBy: QrUsage[];
  singleUse: boolean;
  generatedBy: Types.ObjectId;
  // Set only by an explicit revoke — distinct from validTo simply having
  // elapsed, so the QR Attendance console can tell "expired on schedule"
  // apart from "pulled early" instead of collapsing both into one state.
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const qrUsageSchema = new Schema<QrUsage>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    usedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const qrCodeSchema = new Schema<IQrCode>(
  {
    geofenceId: { type: Schema.Types.ObjectId, ref: 'Geofence', required: true },
    token: { type: String, required: true, unique: true },
    validFrom: { type: Date, required: true },
    validTo: {
      type: Date,
      required: true,
      validate: {
        validator: function validToAfterFrom(this: IQrCode, value: Date) {
          return value.getTime() > this.validFrom.getTime();
        },
        message: 'validTo must be after validFrom.',
      },
    },
    isUsed: { type: Boolean, default: false },
    usedBy: { type: [qrUsageSchema], default: [] },
    singleUse: { type: Boolean, default: false },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

qrCodeSchema.index({ validTo: 1 });

export const QRCode = model<IQrCode>('QRCode', qrCodeSchema);
