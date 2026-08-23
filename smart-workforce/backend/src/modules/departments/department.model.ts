import { type Document, Schema, type Types, model } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  headOfDepartment: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    headOfDepartment: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Department = model<IDepartment>('Department', departmentSchema);
