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

/**
 * Writes a real in-app Notification for one employee, then best-effort
 * pushes to whatever devices they've registered. Fire-and-forget by design,
 * same contract as audit.service.ts#recordAudit: the business action that
 * triggered this (leave approved, payslip released, ...) has already
 * succeeded by the time this runs, so a failure here logs loudly instead of
 * failing that request.
 */
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
  /** A caller's own targeted notifications plus every global broadcast (`recipientId: null`). */
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

    // recipientId === null is a global broadcast — anyone can mark it read.
    // Known simplification: `isRead` is one shared flag on that single
    // document (the fixed schema has no per-recipient read tracking for
    // broadcasts), so this is a real, documented consequence of the schema,
    // not a bug — see backend/README.md#notifications-phase-12.
    if (notification.recipientId && String(notification.recipientId) !== employeeId) {
      throw AppError.forbidden('You cannot access this notification.', 'FORBIDDEN');
    }

    notification.isRead = true;
    await notification.save();
    return toNotificationDTO(notification);
  },

  /** Only ever touches the caller's own targeted notifications — never flips a shared broadcast's read-state for everyone else as a side effect. */
  async markAllRead(actor: ActorContext): Promise<{ count: number }> {
    const employeeId = requireEmployeeId(actor);
    const result = await Notification.updateMany(
      { recipientId: employeeId, isRead: false },
      { $set: { isRead: true } },
    );
    return { count: result.modifiedCount };
  },

  /**
   * `departmentId` given: fans out to one real, individually-read-trackable
   * Notification per active employee in that department (there's no
   * departmentId field on Notification to scope a single shared document
   * by). No `departmentId`: a single `recipientId: null` document, matching
   * the schema's documented "null = broadcast to all" shape. Push delivery
   * for broadcasts is deferred — a real batch send would need the same
   * queued-job treatment as Phase 11's payroll run, not built for
   * notifications yet; only the in-app record is created here.
   */
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

  /** `actor.id` (the User id, not the Employee id) — device tokens belong to the login, not the employee profile. */
  async registerDeviceToken(actor: ActorContext, token: string): Promise<void> {
    await User.findByIdAndUpdate(actor.id, { $addToSet: { deviceTokens: token } });
  },
};
