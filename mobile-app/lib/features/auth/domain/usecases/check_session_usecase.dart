import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';
import 'package:ai_management_system/features/auth/domain/repositories/auth_repository.dart';

class CheckSessionUseCase {
  final AuthRepository _repository;
  const CheckSessionUseCase(this._repository);

  Future<UserEntity?> call() => _repository.getCachedUser();
}
