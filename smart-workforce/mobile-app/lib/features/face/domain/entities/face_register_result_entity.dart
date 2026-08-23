class FaceRegisterResultEntity {
  final String status;
  final int embeddingCount;
  final int discardedCount;

  const FaceRegisterResultEntity({
    required this.status,
    required this.embeddingCount,
    required this.discardedCount,
  });
}
