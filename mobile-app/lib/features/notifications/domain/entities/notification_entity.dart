/// Mirrors `NotificationDTO` (backend/src/modules/notifications/notification.types.ts).
/// `recipientId: null` means a broadcast rather than a targeted
/// notification — not surfaced in the UI, since this app has nothing to
/// scope a broadcast by (no "sent to my department" distinction shown).
class NotificationEntity {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });
}
