import { type Document, Schema, type Types, model } from 'mongoose';

export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    allocated: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    carriedForward: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

leaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

export const LeaveBalance = model<ILeaveBalance>('LeaveBalance', leaveBalanceSchema);
