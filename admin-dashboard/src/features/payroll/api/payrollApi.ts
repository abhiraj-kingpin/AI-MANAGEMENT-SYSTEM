import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  CreateSalaryInput,
  ListPayslipsQuery,
  ListSalariesQuery,
  Payslip,
  PayrollRunRecord,
  RunPayrollInput,
  Salary,
  UpdateSalaryInput,
} from '@/types/api';

export interface SalariesPage {
  items: Salary[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PayslipsPage {
  items: Payslip[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchSalaries(query: ListSalariesQuery): Promise<SalariesPage> {
  const res = await api.get<ApiSuccess<Salary[]>>('/salaries', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

export async function createSalary(input: CreateSalaryInput): Promise<Salary> {
  const res = await api.post<ApiSuccess<{ salary: Salary }>>('/salaries', input);
  return res.data.data.salary;
}

export async function updateSalary(employeeId: string, input: UpdateSalaryInput): Promise<Salary> {
  const res = await api.patch<ApiSuccess<{ salary: Salary }>>(`/salaries/${employeeId}`, input);
  return res.data.data.salary;
}

export async function fetchPayslips(query: ListPayslipsQuery): Promise<PayslipsPage> {
  const res = await api.get<ApiSuccess<Payslip[]>>('/payslips', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

export async function fetchMyPayslips(month?: string): Promise<Payslip[]> {
  const res = await api.get<ApiSuccess<Payslip[]>>('/payslips/me', {
    params: month ? { month } : undefined,
  });
  return res.data.data;
}

export async function releasePayslip(id: string): Promise<Payslip> {
  const res = await api.patch<ApiSuccess<{ payslip: Payslip }>>(`/payslips/${id}/release`);
  return res.data.data.payslip;
}

/**
 * `GET /payslips/:id/pdf` returns raw PDF bytes, not JSON — the one binary
 * response in the whole API, so this is the one api client function that
 * isn't `ApiSuccess<T>`-shaped. Triggers a browser download directly rather
 * than returning the blob, since every caller just wants "download this".
 */
export async function downloadPayslipPdf(id: string, month: string): Promise<void> {
  const res = await api.get<Blob>(`/payslips/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payslip-${month}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function runPayroll(input: RunPayrollInput): Promise<PayrollRunRecord> {
  const res = await api.post<ApiSuccess<PayrollRunRecord>>('/payroll/run', input);
  return res.data.data;
}

export async function fetchPayrollRunStatus(runId: string): Promise<PayrollRunRecord> {
  const res = await api.get<ApiSuccess<PayrollRunRecord>>(`/payroll/runs/${runId}/status`);
  return res.data.data;
}
