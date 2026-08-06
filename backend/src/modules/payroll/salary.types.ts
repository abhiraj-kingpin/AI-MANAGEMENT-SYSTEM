import type { ISalary } from './salary.model';

export interface SalaryDTO {
  id: string;
  employeeId: string;
  baseSalary: number;
  allowances: { hra?: number; transport?: number; medical?: number; other?: number };
  deductions: { pf?: number; tax?: number; other?: number };
  currency: string;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toSalaryDTO(doc: ISalary): SalaryDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    baseSalary: doc.baseSalary,
    allowances: doc.allowances,
    deductions: doc.deductions,
    currency: doc.currency,
    effectiveFrom: doc.effectiveFrom,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
