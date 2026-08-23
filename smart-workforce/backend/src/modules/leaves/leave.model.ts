import { type Document, Schema, type Types, model } from 'mongoose';

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export interface ILeave extends Document {
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: Types.ObjectId | null;
  managerComment?: string;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function endDateOnOrAfterStart(this: ILeave, value: Date) {
          return !this.startDate || value.getTime() >= this.startDate.getTime();
        },
        message: 'endDate must be on or after startDate.',
      },
    },
    totalDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'pending', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    managerComment: String,
    attachmentUrl: String,
  },
  { timestamps: true },
);

leaveSchema.index({ startDate: 1, endDate: 1 });

export const Leave = model<ILeave>('Leave', leaveSchema);
