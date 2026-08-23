import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/face/domain/entities/face_register_result_entity.dart';
import 'package:ai_management_system/features/face/domain/repositories/face_repository.dart';

class RegisterFaceEmbeddingsUseCase {
  final FaceRepository _repository;
  const RegisterFaceEmbeddingsUseCase(this._repository);

  Future<Result<FaceRegisterResultEntity>> call(List<List<double>> embeddings) {
    return _repository.registerEmbeddings(embeddings);
  }
}
