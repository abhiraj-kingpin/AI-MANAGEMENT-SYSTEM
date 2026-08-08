import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMyPayslips, fetchPayslips } from '@/features/payroll/api/payrollApi';
import type { ListPayslipsQuery } from '@/types/api';

/** `GET /payslips` is Super Admin/HR only server-side — only called from the role-gated section of PayrollPage (see PayrollPage's `canManage`). */
export function usePayslips(query: ListPayslipsQuery, enabled = true) {
  return useQuery({
    queryKey: ['payslips', 'list', query],
    queryFn: () => fetchPayslips(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** `GET /payslips/me` — always the caller's own, released-only history, open to every role. */
export function useMyPayslips(month?: string) {
  return useQuery({
    queryKey: ['payslips', 'me', month],
    queryFn: () => fetchMyPayslips(month),
  });
}
