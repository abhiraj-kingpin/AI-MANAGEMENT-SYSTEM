import { useQuery } from '@tanstack/react-query';
import { fetchMyBalance, fetchMyLeaves } from '@/features/leaves/api/leavesApi';
import type { LeaveStatus } from '@/types/api';

export function useMyLeaves(status?: LeaveStatus) {
  return useQuery({
    queryKey: ['leaves', 'me', status],
    queryFn: () => fetchMyLeaves(status),
  });
}

export function useMyBalance() {
  return useQuery({
    queryKey: ['leaves', 'balance'],
    queryFn: fetchMyBalance,
  });
}
