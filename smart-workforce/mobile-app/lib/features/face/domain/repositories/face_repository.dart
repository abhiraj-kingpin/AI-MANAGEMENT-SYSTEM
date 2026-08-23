import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/face/domain/entities/face_register_result_entity.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';

abstract class FaceRepository {
  Future<Result<FaceRegisterResultEntity>> registerEmbeddings(List<List<double>> embeddings);

  Future<Result<FaceRegistrationStatusEntity>> getRegistrationStatus();
}
