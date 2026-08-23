import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { notificationService } from './notification.service';
import type { ListMyNotificationsQuery } from './notification.validators';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListMyNotificationsQuery;
  const result = await notificationService.getMyNotifications(actorFromRequest(req), query);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, actorFromRequest(req));
  sendSuccess(res, { notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(actorFromRequest(req));
  sendSuccess(res, result);
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcast(req.body);
  sendSuccess(res, result, 201);
});

export const registerDeviceToken = asyncHandler(async (req, res) => {
  await notificationService.registerDeviceToken(actorFromRequest(req), req.body.token);
  sendSuccess(res, { status: 'ok' });
});
