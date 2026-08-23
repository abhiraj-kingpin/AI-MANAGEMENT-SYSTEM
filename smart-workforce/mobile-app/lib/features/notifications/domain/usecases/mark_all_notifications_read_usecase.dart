import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/notifications/domain/repositories/notification_repository.dart';

class MarkAllNotificationsReadUseCase {
  final NotificationRepository _repository;
  const MarkAllNotificationsReadUseCase(this._repository);

  Future<Result<int>> call() => _repository.markAllRead();
}
