import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/get_my_notifications_usecase.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/mark_all_notifications_read_usecase.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/mark_notification_read_usecase.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_state.dart';

class NotificationController extends StateNotifier<NotificationState> {
  final GetMyNotificationsUseCase _getMyNotificationsUseCase;
  final MarkNotificationReadUseCase _markNotificationReadUseCase;
  final MarkAllNotificationsReadUseCase _markAllNotificationsReadUseCase;

  NotificationController({
    required GetMyNotificationsUseCase getMyNotificationsUseCase,
    required MarkNotificationReadUseCase markNotificationReadUseCase,
    required MarkAllNotificationsReadUseCase markAllNotificationsReadUseCase,
  })  : _getMyNotificationsUseCase = getMyNotificationsUseCase,
        _markNotificationReadUseCase = markNotificationReadUseCase,
        _markAllNotificationsReadUseCase = markAllNotificationsReadUseCase,
        super(const NotificationState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _getMyNotificationsUseCase(unreadOnly: state.unreadOnly);
    result.when(
      success: (notifications) =>
          state = state.copyWith(isLoading: false, notifications: notifications),
      failure: (failure) =>
          state = state.copyWith(isLoading: false, errorMessage: failure.message),
    );
  }

  Future<void> setUnreadOnly(bool value) async {
    state = state.copyWith(unreadOnly: value);
    await load();
  }

  Future<void> markRead(String id) async {
    final result = await _markNotificationReadUseCase(id);
    result.when(
      success: (_) => load(),
      failure: (failure) => state = state.copyWith(errorMessage: failure.message),
    );
  }

  Future<void> markAllRead() async {
    final result = await _markAllNotificationsReadUseCase();
    result.when(
      success: (_) => load(),
      failure: (failure) => state = state.copyWith(errorMessage: failure.message),
    );
  }
}
