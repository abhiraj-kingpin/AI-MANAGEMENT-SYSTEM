import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMyNotifications } from '@/features/notifications/api/notificationsApi';
import type { ListMyNotificationsQuery } from '@/types/api';

/** `GET /notifications/me` — always the caller's own feed plus every broadcast, open to every role. */
export function useMyNotifications(query: ListMyNotificationsQuery) {
  return useQuery({
    queryKey: ['notifications', 'me', query],
    queryFn: () => fetchMyNotifications(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Just the unread count, for the Topbar bell badge — reuses the same list
 * endpoint with `limit: 1` and reads `meta.total` rather than adding a
 * dedicated count endpoint the backend doesn't have. Refetches every 30s
 * since there's no push/websocket channel to invalidate it on arrival.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchMyNotifications({ unread: true, page: 1, limit: 1 }),
    select: (data) => data.total,
    refetchInterval: 30000,
  });
}
