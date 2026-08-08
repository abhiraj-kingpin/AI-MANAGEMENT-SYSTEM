import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';

abstract class NotificationRepository {
  Future<Result<List<NotificationEntity>>> getMyNotifications({bool unreadOnly = false});
  Future<Result<NotificationEntity>> markRead(String id);
  Future<Result<int>> markAllRead();
}
