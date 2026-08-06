import { type Document, Schema, model } from 'mongoose';

// const tuple (not `type` + array) so this can feed `z.enum(...)` directly
// in shift.validators.ts — see shared/constants/roles.ts for the pattern.
export const SHIFT_TYPES = ['morning', 'night', 'rotational', 'flexible'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour

export interface IShift extends Document {
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: SHIFT_TYPES, required: true },
    startTime: { type: String, required: true, match: [TIME_REGEX, 'Expected 24-hour HH:mm'] },
    endTime: { type: String, required: true, match: [TIME_REGEX, 'Expected 24-hour HH:mm'] },
    gracePeriodMinutes: { type: Number, default: 10, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Shift = model<IShift>('Shift', shiftSchema);
