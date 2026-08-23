class FaceRegistrationStatusEntity {
  final String status;
  final int embeddingCount;
  final DateTime? lastRegisteredAt;

  const FaceRegistrationStatusEntity({
    required this.status,
    required this.embeddingCount,
    this.lastRegisteredAt,
  });

  bool get isRegistered => status == 'registered';
}
