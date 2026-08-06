import { type Document, Schema, type Types, model } from 'mongoose';

interface Allowances {
  hra?: number;
  transport?: number;
  medical?: number;
  other?: number;
}

interface Deductions {
  pf?: number;
  tax?: number;
  other?: number;
}

export interface ISalary extends Document {
  employeeId: Types.ObjectId;
  baseSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  currency: string;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const allowancesSchema = new Schema<Allowances>(
  { hra: Number, transport: Number, medical: Number, other: Number },
  { _id: false },
);

const deductionsSchema = new Schema<Deductions>(
  { pf: Number, tax: Number, other: Number },
  { _id: false },
);

const salarySchema = new Schema<ISalary>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    baseSalary: { type: Number, required: true, min: 0 },
    allowances: { type: allowancesSchema, default: () => ({}) },
    deductions: { type: deductionsSchema, default: () => ({}) },
    // Monetary fields use Number with 2-decimal rounding at the service
    // layer for v1 — see docs/architecture/03-database-schema.md's note on
    // moving to integer minor-units storage as a future hardening pass.
    currency: { type: String, default: 'INR' },
    effectiveFrom: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Salary = model<ISalary>('Salary', salarySchema);
