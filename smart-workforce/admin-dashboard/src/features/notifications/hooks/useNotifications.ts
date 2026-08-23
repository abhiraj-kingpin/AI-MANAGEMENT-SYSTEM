import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMyNotifications } from '@/features/notifications/api/notificationsApi';
import type { ListMyNotificationsQuery } from '@/types/api';

export function useMyNotifications(query: ListMyNotificationsQuery) {
  return useQuery({
    queryKey: ['notifications', 'me', query],
    queryFn: () => fetchMyNotifications(query),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchMyNotifications({ unread: true, page: 1, limit: 1 }),
    select: (data) => data.total,
    refetchInterval: 30000,
  });
}
