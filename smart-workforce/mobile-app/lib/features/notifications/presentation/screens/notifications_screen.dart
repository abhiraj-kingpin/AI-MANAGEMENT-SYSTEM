import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_providers.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _dateTimeFormat = DateFormat.MMMd().add_jm();

const _typeGlyphs = {
  'leave': ('L', WPColors.accent, WPColors.accentLight),
  'attendance': ('A', WPColors.info, WPColors.infoBg),
  'payslip': ('P', WPColors.success, WPColors.successBg),
};

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationControllerProvider);
    final controller = ref.read(notificationControllerProvider.notifier);

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 40),
            children: [
              Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.of(context).maybePop(),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: WPColors.borderMed)),
                      alignment: Alignment.center,
                      child: const Icon(Icons.arrow_back, size: 18, color: WPColors.text),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Notifications', style: WPText.sans(size: 19, weight: FontWeight.w800))),
                  if (state.unreadCount > 0)
                    InkWell(
                      onTap: controller.markAllRead,
                      child: Text('Mark all read',
                          style: WPText.sans(size: 12, weight: FontWeight.w700, color: WPColors.accent),),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Text('Unread only', style: WPText.sans(size: 13, weight: FontWeight.w600)),
                  const Spacer(),
                  Switch(
                    value: state.unreadOnly,
                    onChanged: controller.setUnreadOnly,
                    activeColor: Colors.white,
                    activeTrackColor: WPColors.accent,
                  ),
                ],
              ),
              if (state.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(state.errorMessage!, style: WPText.sans(size: 12.5, color: WPColors.danger)),
              ],
              const SizedBox(height: 8),
              if (state.isLoading && state.notifications.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (state.notifications.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: Text('Nothing here.', style: WPText.sans(size: 13, color: WPColors.textDim))),
                )
              else
                WPCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (int i = 0; i < state.notifications.length; i++)
                        _NotificationRow(
                          notification: state.notifications[i],
                          isLast: i == state.notifications.length - 1,
                          onTap: state.notifications[i].isRead ? null : () => controller.markRead(state.notifications[i].id),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  final NotificationEntity notification;
  final bool isLast;
  final VoidCallback? onTap;
  const _NotificationRow({required this.notification, required this.isLast, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final (glyph, fg, bg) = _typeGlyphs[notification.type] ?? ('N', WPColors.textDim, WPColors.bg);
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: notification.isRead ? null : WPColors.accentLight.withOpacity(0.35),
          border: isLast ? null : const Border(bottom: BorderSide(color: WPColors.borderLight)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            WPIconTile(label: glyph, bg: bg, fg: fg, size: 36),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(notification.title, style: WPText.sans(size: 13.5, weight: FontWeight.w700)),
                  const SizedBox(height: 3),
                  Text(notification.body,
                      style: WPText.sans(size: 12, weight: FontWeight.w500, color: WPColors.textDim, height: 1.35),),
                  const SizedBox(height: 5),
                  Text(_dateTimeFormat.format(notification.createdAt.toLocal()),
                      style: WPText.sans(size: 10.5, weight: FontWeight.w500, color: WPColors.textFaint),),
                ],
              ),
            ),
            if (!notification.isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 5),
                decoration: const BoxDecoration(color: WPColors.accent, shape: BoxShape.circle),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
