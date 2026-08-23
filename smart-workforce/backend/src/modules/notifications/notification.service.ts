import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import type { PaginatedResult } from '../../shared/types/pagination';
import { requireEmployeeId } from '../../shared/utils/actor';
import { Employee } from '../employees/employee.model';
import { User } from '../users/user.model';
import { Notification, type NotificationType } from './notification.model';
import { type NotificationDTO, toNotificationDTO } from './notification.types';
import type { BroadcastInput, ListMyNotificationsQuery } from './notification.validators';
import { sendPushNotification } from './push.service';

export async function notify(
  recipientId: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await Notification.create({ recipientId, title, body, type, data });

    const employee = await Employee.findById(recipientId).select('userId');
    if (!employee) return;
    const user = await User.findById(employee.userId).select('deviceTokens');
    if (!user) return;

    await sendPushNotification(user.deviceTokens, title, body);
  } catch (error) {
    logger.error('Failed to create/push notification', { recipientId, title, error });
  }
}

export const notificationService = {
  async getMyNotifications(
    actor: ActorContext,
    query: ListMyNotificationsQuery,
  ): Promise<PaginatedResult<NotificationDTO>> {
    const employeeId = requireEmployeeId(actor);
    const filter: Record<string, unknown> = {
      $or: [{ recipientId: employeeId }, { recipientId: null }],
    };
    if (query.unread) filter.isRead = false;

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Notification.countDocuments(filter),
    ]);

    return {
      items: items.map(toNotificationDTO),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async markRead(id: string, actor: ActorContext): Promise<NotificationDTO> {
    const employeeId = requireEmployeeId(actor);
    const notification = await Notification.findById(id);
    if (!notification) {
      throw AppError.notFound('Notification not found.');
    }

    if (notification.recipientId && String(notification.recipientId) !== employeeId) {
      throw AppError.forbidden('You cannot access this notification.', 'FORBIDDEN');
    }

    notification.isRead = true;
    await notification.save();
    return toNotificationDTO(notification);
  },

  async markAllRead(actor: ActorContext): Promise<{ count: number }> {
    const employeeId = requireEmployeeId(actor);
    const result = await Notification.updateMany(
      { recipientId: employeeId, isRead: false },
      { $set: { isRead: true } },
    );
    return { count: result.modifiedCount };
  },

  async broadcast(input: BroadcastInput): Promise<{ count: number }> {
    if (input.departmentId) {
      const employees = await Employee.find({
        departmentId: input.departmentId,
        status: 'active',
      }).select('_id');
      if (employees.length === 0) return { count: 0 };

      await Notification.insertMany(
        employees.map((e) => ({
          recipientId: e._id,
          title: input.title,
          body: input.body,
          type: input.type,
        })),
      );
      return { count: employees.length };
    }

    await Notification.create({
      recipientId: null,
      title: input.title,
      body: input.body,
      type: input.type,
    });
    return { count: 1 };
  },

  async registerDeviceToken(actor: ActorContext, token: string): Promise<void> {
    await User.findByIdAndUpdate(actor.id, { $addToSet: { deviceTokens: token } });
  },
};
