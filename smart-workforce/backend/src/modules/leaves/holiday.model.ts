import { type Document, Schema, type Types, model } from 'mongoose';

export interface IHoliday extends Document {
  name: string;
  date: Date;
  isOptional: boolean;
  branchScope: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    isOptional: { type: Boolean, default: false },
    branchScope: [{ type: Schema.Types.ObjectId, ref: 'Geofence' }],
  },
  { timestamps: true },
);

export const Holiday = model<IHoliday>('Holiday', holidaySchema);
