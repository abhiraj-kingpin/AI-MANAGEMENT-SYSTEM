import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';
import 'package:ai_management_system/features/face/domain/repositories/face_repository.dart';

class GetFaceRegistrationStatusUseCase {
  final FaceRepository _repository;
  const GetFaceRegistrationStatusUseCase(this._repository);

  Future<Result<FaceRegistrationStatusEntity>> call() {
    return _repository.getRegistrationStatus();
  }
}
