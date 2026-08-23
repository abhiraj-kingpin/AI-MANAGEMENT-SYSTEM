import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/domain/repositories/notification_repository.dart';

class MarkNotificationReadUseCase {
  final NotificationRepository _repository;
  const MarkNotificationReadUseCase(this._repository);

  Future<Result<NotificationEntity>> call(String id) => _repository.markRead(id);
}
