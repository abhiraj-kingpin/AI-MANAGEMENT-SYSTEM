import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';

abstract class AuthRepository {
  Future<Result<AuthSessionEntity>> login({
    required String email,
    required String password,
  });

  Future<void> logout();

  /// Reads the locally cached session (no network call) — used on app
  /// launch to decide whether to route to the home screen or /login.
  Future<UserEntity?> getCachedUser();
}
