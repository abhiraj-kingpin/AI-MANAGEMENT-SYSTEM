import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConsoleUsers, inviteConsoleUser } from '@/features/users/api/usersApi';
import type { InviteUserInput } from '@/types/api';

export function useConsoleUsers(enabled = true) {
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: fetchConsoleUsers,
    enabled,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => inviteConsoleUser(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
