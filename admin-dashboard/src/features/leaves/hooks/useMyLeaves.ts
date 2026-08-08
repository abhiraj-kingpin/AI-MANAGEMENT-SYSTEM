import { useQuery } from '@tanstack/react-query';
import { fetchMyBalance, fetchMyLeaves } from '@/features/leaves/api/leavesApi';
import type { LeaveStatus } from '@/types/api';

/** `GET /leaves/me` — always the caller's own history, open to every role. */
export function useMyLeaves(status?: LeaveStatus) {
  return useQuery({
    queryKey: ['leaves', 'me', status],
    queryFn: () => fetchMyLeaves(status),
  });
}

/** `GET /leaves/balance` — always the caller's own balances, open to every role. */
export function useMyBalance() {
  return useQuery({
    queryKey: ['leaves', 'balance'],
    queryFn: fetchMyBalance,
  });
}
