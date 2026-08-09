/// Mirrors the backend's `FaceRegistrationStatusDTO` exactly
/// (`GET /face/registration-status`) — whether this employee currently has
/// an active reference set, and when it was last (re)registered.
class FaceRegistrationStatusEntity {
  final String status; // 'not_registered' | 'registered'
  final int embeddingCount;
  final DateTime? lastRegisteredAt;

  const FaceRegistrationStatusEntity({
    required this.status,
    required this.embeddingCount,
    this.lastRegisteredAt,
  });

  bool get isRegistered => status == 'registered';
}
