import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_state.dart';

NotificationEntity _fake({required bool isRead}) {
  return NotificationEntity(
    id: 'n1',
    title: 'Title',
    body: 'Body',
    type: 'announcement',
    isRead: isRead,
    createdAt: DateTime.now(),
  );
}

void main() {
  group('NotificationState.unreadCount', () {
    test('counts only unread notifications', () {
      final state = NotificationState(
        isLoading: false,
        notifications: [_fake(isRead: true), _fake(isRead: false), _fake(isRead: false)],
      );

      expect(state.unreadCount, 2);
    });

    test('is zero for an empty or all-read list', () {
      const empty = NotificationState(isLoading: false);
      final allRead = NotificationState(
        isLoading: false,
        notifications: [_fake(isRead: true), _fake(isRead: true)],
      );

      expect(empty.unreadCount, 0);
      expect(allRead.unreadCount, 0);
    });
  });
}
