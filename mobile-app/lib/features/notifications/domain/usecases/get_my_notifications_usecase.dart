import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/domain/repositories/notification_repository.dart';

class GetMyNotificationsUseCase {
  final NotificationRepository _repository;
  const GetMyNotificationsUseCase(this._repository);

  Future<Result<List<NotificationEntity>>> call({bool unreadOnly = false}) {
    return _repository.getMyNotifications(unreadOnly: unreadOnly);
  }
}
