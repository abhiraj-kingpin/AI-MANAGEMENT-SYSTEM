import { type Document, Schema, type Types, model } from 'mongoose';

// const tuple (not `type` + array) so this can feed `z.enum(...)` directly
// in payslip.validators.ts — see shared/constants/roles.ts for the pattern.
export const PAYSLIP_STATUSES = ['draft', 'generated', 'released'] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // "YYYY-MM"

export interface IPayslip extends Document {
  employeeId: Types.ObjectId;
  salaryId: Types.ObjectId;
  month: string;
  grossPay: number;
  netPay: number;
  latePenalty: number;
  overtimePay: number;
  bonus: number;
  pdfUrl?: string;
  status: PayslipStatus;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const payslipSchema = new Schema<IPayslip>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    salaryId: { type: Schema.Types.ObjectId, ref: 'Salary', required: true },
    month: { type: String, required: true, match: [MONTH_REGEX, 'Expected YYYY-MM'] },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    latePenalty: { type: Number, default: 0, min: 0 },
    overtimePay: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    pdfUrl: String,
    status: { type: String, enum: PAYSLIP_STATUSES, default: 'draft' },
    generatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

payslipSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export const Payslip = model<IPayslip>('Payslip', payslipSchema);
