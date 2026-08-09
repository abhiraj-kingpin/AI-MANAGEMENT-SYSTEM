/// Mirrors the backend's `FaceRegisterResultDTO` — the response of
/// `POST /face/register-embeddings`. `discardedCount` is always 0 on this
/// path (no server-side quality filtering is applied to client-computed
/// embeddings — see `faceService.registerWithEmbeddings`'s doc comment on
/// the backend) but the field is kept for shape-parity with the
/// image-upload registration result.
class FaceRegisterResultEntity {
  final String status; // 'registered' | 'failed'
  final int embeddingCount;
  final int discardedCount;

  const FaceRegisterResultEntity({
    required this.status,
    required this.embeddingCount,
    required this.discardedCount,
  });
}
