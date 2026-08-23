import { type Document, Schema, model } from 'mongoose';

export const SHIFT_TYPES = ['morning', 'night', 'rotational', 'flexible'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

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
