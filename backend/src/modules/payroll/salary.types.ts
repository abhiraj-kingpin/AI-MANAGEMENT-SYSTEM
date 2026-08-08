import type { EmployeeRefDTO } from '../../shared/utils/employeeRef';
import type { ISalary } from './salary.model';

export interface SalaryDTO {
  id: string;
  employeeId: string;
  employee?: EmployeeRefDTO;
  baseSalary: number;
  allowances: { hra?: number; transport?: number; medical?: number; other?: number };
  deductions: { pf?: number; tax?: number; other?: number };
  currency: string;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toSalaryDTO(doc: ISalary, employee?: EmployeeRefDTO): SalaryDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    employee,
    baseSalary: doc.baseSalary,
    allowances: doc.allowances,
    deductions: doc.deductions,
    currency: doc.currency,
    effectiveFrom: doc.effectiveFrom,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
