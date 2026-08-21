import 'dart:convert';

import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:ai_management_system/features/auth/data/models/auth_session_model.dart';
import 'package:ai_management_system/features/auth/data/models/user_model.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';
import 'package:ai_management_system/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final SecureStorageService _secureStorage;

  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required SecureStorageService secureStorage,
  })  : _remoteDataSource = remoteDataSource,
        _secureStorage = secureStorage;

  @override
  Future<Result<AuthSessionEntity>> login({
    required String email,
    required String password,
  }) {
    return _authenticate(
        () => _remoteDataSource.login(email: email, password: password));
  }

  @override
  Future<Result<AuthSessionEntity>> claimAccount({
    required String email,
    required String password,
  }) {
    return _authenticate(
      () => _remoteDataSource.claimAccount(email: email, password: password),
    );
  }

  /// [login] and [claimAccount] both end the same way — a session comes
  /// back from the server and gets persisted locally the same way — this
  /// is that shared tail, parameterized only by which call produced it.
  Future<Result<AuthSessionEntity>> _authenticate(
    Future<AuthSessionModel> Function() call,
  ) async {
    try {
      final session = await call();
      await _secureStorage.saveSession(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        userJson: jsonEncode({
          'id': session.user.id,
          'email': session.user.email,
          'role': session.user.role,
        }),
      );
      return Success(session);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<void> logout() async {
    await _remoteDataSource.logout();
    await _secureStorage.clearSession();
  }

  @override
  Future<UserEntity?> getCachedUser() async {
    final token = await _secureStorage.readAccessToken();
    final userJson = await _secureStorage.readCachedUserJson();
    if (token == null || userJson == null) return null;

    final map = jsonDecode(userJson) as Map<String, dynamic>;
    return UserModel.fromJson(map);
  }
}
