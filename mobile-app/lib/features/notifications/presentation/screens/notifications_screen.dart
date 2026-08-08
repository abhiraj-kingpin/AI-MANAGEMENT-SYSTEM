import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_providers.dart';

final _dateTimeFormat = DateFormat.MMMd().add_jm();

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationControllerProvider);
    final controller = ref.read(notificationControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: state.unreadCount == 0 ? null : controller.markAllRead,
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: Column(
        children: [
          SwitchListTile(
            title: const Text('Unread only'),
            value: state.unreadOnly,
            onChanged: controller.setUnreadOnly,
          ),
          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.load,
              child: state.isLoading && state.notifications.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : state.notifications.isEmpty
                      ? ListView(
                          children: const [
                            Padding(
                              padding: EdgeInsets.symmetric(vertical: 64),
                              child: Center(child: Text('Nothing here.')),
                            ),
                          ],
                        )
                      : ListView.builder(
                          itemCount: state.notifications.length,
                          itemBuilder: (context, index) {
                            final NotificationEntity notification = state.notifications[index];
                            return ListTile(
                              leading: Icon(
                                notification.isRead
                                    ? Icons.notifications_none
                                    : Icons.notifications_active,
                                color: notification.isRead
                                    ? null
                                    : Theme.of(context).colorScheme.primary,
                              ),
                              title: Text(notification.title),
                              subtitle: Text(
                                '${notification.body}\n${_dateTimeFormat.format(notification.createdAt.toLocal())}',
                              ),
                              isThreeLine: true,
                              onTap: notification.isRead
                                  ? null
                                  : () => controller.markRead(notification.id),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
