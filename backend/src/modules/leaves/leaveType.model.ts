import { type Document, Schema, model } from 'mongoose';

export interface ILeaveType extends Document {
  name: string;
  defaultAnnualQuota: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    defaultAnnualQuota: { type: Number, required: true, min: 0 },
    isPaid: { type: Boolean, default: true },
    carryForward: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const LeaveType = model<ILeaveType>('LeaveType', leaveTypeSchema);
