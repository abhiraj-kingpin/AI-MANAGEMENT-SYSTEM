import 'dart:convert';

import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';
import 'package:ai_management_system/core/utils/jwt_utils.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:ai_management_system/features/auth/data/models/auth_session_model.dart';
import 'package:ai_management_system/features/auth/data/models/employee_summary_model.dart';
import 'package:ai_management_system/features/auth/data/models/user_model.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';
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
        () => _remoteDataSource.login(email: email, password: password),);
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
          if (session.employee != null)
            'employee': (session.employee as EmployeeSummaryModel).toJson(),
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

  @override
  Future<EmployeeSummaryEntity?> getCachedEmployee() async {
    final userJson = await _secureStorage.readCachedUserJson();
    if (userJson == null) return null;

    final map = jsonDecode(userJson) as Map<String, dynamic>;
    final employeeMap = map['employee'] as Map<String, dynamic>?;
    if (employeeMap == null) return null;
    return EmployeeSummaryModel.fromJson(employeeMap);
  }

  @override
  Future<EmployeeSummaryEntity?> refreshEmployeeLink() async {
    try {
      final data = await _remoteDataSource.getMe();
      final employeeJson = data['employee'] as Map<String, dynamic>?;
      if (employeeJson == null) return null;
      final employee = EmployeeSummaryModel.fromJson(employeeJson);

      final userJson = await _secureStorage.readCachedUserJson();
      if (userJson != null) {
        final map = jsonDecode(userJson) as Map<String, dynamic>;
        map['employee'] = employee.toJson();
        await _secureStorage.saveCachedUserJson(jsonEncode(map));
      }

      // Updating the cached display data above is not enough on its own:
      // the access token issued at login/claim carries its own embedded
      // employeeId claim (see auth.service.ts issueSession), and a token
      // minted before the link existed keeps that claim empty for its
      // entire lifetime. Endpoints that require an employee identity (Leave,
      // Payslips /me routes) read that claim, not the database, so without
      // this they'd keep failing with "not linked to an employee profile"
      // even after the UI starts showing the right employee. Exchanging the
      // refresh token mints a fresh access token — the backend re-derives
      // the employee link from the database on every refresh, so this is
      // what actually fixes authorization, not just the display.
      final refreshToken = await _secureStorage.readRefreshToken();
      if (refreshToken != null) {
        try {
          final tokens =
              await _remoteDataSource.refreshAccessToken(refreshToken);
          await _secureStorage.saveAccessToken(tokens.accessToken);
          await _secureStorage.saveRefreshToken(tokens.refreshToken);
        } on ServerException {
          // Display data is still healed even if this leg fails; the next
          // 401 will go through the normal reactive refresh in DioClient.
        } on NetworkException {
          // Same as above.
        }
      }

      return employee;
    } on ServerException {
      return null;
    } on NetworkException {
      return null;
    }
  }

  @override
  Future<bool> currentAccessTokenHasEmployeeId() async {
    final token = await _secureStorage.readAccessToken();
    if (token == null) return false;
    return JwtUtils.hasEmployeeId(token);
  }
}
