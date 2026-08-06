import type { IPayslip, PayslipStatus } from './payslip.model';

export interface PayslipDTO {
  id: string;
  employeeId: string;
  salaryId: string;
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

export function toPayslipDTO(doc: IPayslip): PayslipDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    salaryId: String(doc.salaryId),
    month: doc.month,
    grossPay: doc.grossPay,
    netPay: doc.netPay,
    latePenalty: doc.latePenalty,
    overtimePay: doc.overtimePay,
    bonus: doc.bonus,
    pdfUrl: doc.pdfUrl,
    status: doc.status,
    generatedAt: doc.generatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
