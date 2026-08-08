import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  broadcastNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notificationsApi';
import type { BroadcastInput } from '@/types/api';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useBroadcastNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BroadcastInput) => broadcastNotification(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
