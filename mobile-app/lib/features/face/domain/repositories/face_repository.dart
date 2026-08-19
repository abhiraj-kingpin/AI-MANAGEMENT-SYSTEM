import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/face/domain/entities/face_register_result_entity.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';

abstract class FaceRepository {
  /// Registers using embeddings computed on-device (see
  /// `FaceEmbeddingGenerator`) — 3 to 5 of them, mirroring the
  /// backend's `MIN_REGISTRATION_IMAGES`/`MAX_REGISTRATION_IMAGES`.
  Future<Result<FaceRegisterResultEntity>> registerEmbeddings(List<List<double>> embeddings);

  Future<Result<FaceRegistrationStatusEntity>> getRegistrationStatus();
}
