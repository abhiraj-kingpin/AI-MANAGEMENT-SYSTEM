import { type Document, Schema, type Types, model } from 'mongoose';

export interface IShiftAssignment extends Document {
  employeeId: Types.ObjectId;
  shiftId: Types.ObjectId;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const shiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: {
      type: Date,
      default: null,
      validate: {
        validator: function effectiveToAfterFrom(this: IShiftAssignment, value: Date | null) {
          if (!value) return true;
          return value.getTime() >= this.effectiveFrom.getTime();
        },
        message: 'effectiveTo must be on or after effectiveFrom.',
      },
    },
  },
  { timestamps: true },
);

shiftAssignmentSchema.index({ employeeId: 1, effectiveFrom: -1 });

export const ShiftAssignment = model<IShiftAssignment>('ShiftAssignment', shiftAssignmentSchema);
