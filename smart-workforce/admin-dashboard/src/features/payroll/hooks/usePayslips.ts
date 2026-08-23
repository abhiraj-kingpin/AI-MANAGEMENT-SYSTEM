import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMyPayslips, fetchPayslips } from '@/features/payroll/api/payrollApi';
import type { ListPayslipsQuery } from '@/types/api';

export function usePayslips(query: ListPayslipsQuery, enabled = true) {
  return useQuery({
    queryKey: ['payslips', 'list', query],
    queryFn: () => fetchPayslips(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMyPayslips(month?: string) {
  return useQuery({
    queryKey: ['payslips', 'me', month],
    queryFn: () => fetchMyPayslips(month),
  });
}
