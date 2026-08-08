import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  BroadcastInput,
  ListMyNotificationsQuery,
  Notification,
} from '@/types/api';

export interface NotificationsPage {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchMyNotifications(
  query: ListMyNotificationsQuery,
): Promise<NotificationsPage> {
  const res = await api.get<ApiSuccess<Notification[]>>('/notifications/me', { params: query });
  return {
    items: res.data.data,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? query.limit ?? 20,
    total: res.data.meta?.total ?? 0,
    pages: res.data.meta?.pages ?? 1,
  };
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const res = await api.patch<ApiSuccess<{ notification: Notification }>>(
    `/notifications/${id}/read`,
  );
  return res.data.data.notification;
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const res = await api.patch<ApiSuccess<{ count: number }>>('/notifications/read-all');
  return res.data.data;
}

export async function broadcastNotification(input: BroadcastInput): Promise<{ count: number }> {
  const res = await api.post<ApiSuccess<{ count: number }>>('/notifications/broadcast', input);
  return res.data.data;
}
