import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';

class NotificationState {
  final bool isLoading;
  final bool unreadOnly;
  final List<NotificationEntity> notifications;
  final String? errorMessage;

  const NotificationState({
    this.isLoading = true,
    this.unreadOnly = false,
    this.notifications = const [],
    this.errorMessage,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationState copyWith({
    bool? isLoading,
    bool? unreadOnly,
    List<NotificationEntity>? notifications,
    String? errorMessage,
  }) {
    return NotificationState(
      isLoading: isLoading ?? this.isLoading,
      unreadOnly: unreadOnly ?? this.unreadOnly,
      notifications: notifications ?? this.notifications,
      errorMessage: errorMessage,
    );
  }
}
