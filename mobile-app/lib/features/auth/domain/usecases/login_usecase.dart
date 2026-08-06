import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';
import 'package:ai_management_system/features/auth/domain/repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository _repository;
  const LoginUseCase(this._repository);

  Future<Result<AuthSessionEntity>> call({
    required String email,
    required String password,
  }) {
    return _repository.login(email: email, password: password);
  }
}
