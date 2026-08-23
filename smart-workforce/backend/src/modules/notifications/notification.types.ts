import type { INotification, NotificationType } from './notification.model';

export interface NotificationDTO {
  id: string;
  recipientId: string | null;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export function toNotificationDTO(doc: INotification): NotificationDTO {
  return {
    id: doc.id as string,
    recipientId: doc.recipientId ? String(doc.recipientId) : null,
    title: doc.title,
    body: doc.body,
    type: doc.type,
    isRead: doc.isRead,
    data: doc.data,
    createdAt: doc.createdAt,
  };
}
