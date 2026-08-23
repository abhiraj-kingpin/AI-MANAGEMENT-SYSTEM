import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/notifications/data/datasources/notification_remote_datasource.dart';
import 'package:ai_management_system/features/notifications/data/repositories_impl/notification_repository_impl.dart';
import 'package:ai_management_system/features/notifications/domain/repositories/notification_repository.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/get_my_notifications_usecase.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/mark_all_notifications_read_usecase.dart';
import 'package:ai_management_system/features/notifications/domain/usecases/mark_notification_read_usecase.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_controller.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_state.dart';

final _notificationRemoteDataSourceProvider = Provider<NotificationRemoteDataSource>((ref) {
  return NotificationRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepositoryImpl(
    remoteDataSource: ref.watch(_notificationRemoteDataSourceProvider),
  );
});

final notificationControllerProvider =
    StateNotifierProvider<NotificationController, NotificationState>((ref) {
  final repository = ref.watch(notificationRepositoryProvider);
  return NotificationController(
    getMyNotificationsUseCase: GetMyNotificationsUseCase(repository),
    markNotificationReadUseCase: MarkNotificationReadUseCase(repository),
    markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase(repository),
  );
});
