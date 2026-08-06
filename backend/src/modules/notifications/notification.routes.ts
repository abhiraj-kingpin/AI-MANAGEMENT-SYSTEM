import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as notificationController from './notification.controller';
import {
  broadcastSchema,
  deviceTokenSchema,
  listMyNotificationsQuerySchema,
} from './notification.validators';

const router = Router();

router.use(authenticate);

// Self-service — always the caller's own feed.
router.get(
  '/me',
  validate(listMyNotificationsQuerySchema),
  notificationController.getMyNotifications,
);
router.patch('/:id/read', notificationController.markNotificationRead);
router.patch('/read-all', notificationController.markAllNotificationsRead);
router.post(
  '/device-token',
  validate(deviceTokenSchema),
  notificationController.registerDeviceToken,
);

// Announcements — Super Admin/HR only, per
// docs/architecture/04-api-documentation.md#notifications-notifications.
router.post(
  '/broadcast',
  requireRole('super_admin', 'hr'),
  validate(broadcastSchema),
  notificationController.broadcastNotification,
);

export { router as notificationRouter };
