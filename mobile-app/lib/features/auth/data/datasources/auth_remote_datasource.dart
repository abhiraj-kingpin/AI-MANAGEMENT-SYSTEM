import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart'
    show ServerException;
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/auth/data/models/auth_session_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthSessionModel> login(
      {required String email, required String password});

  /// Activates an account HR already created (see backend
  /// `employee.service.ts#createEmployee`'s `accountClaimed: false`) —
  /// same response shape as [login] since a successful claim logs the
  /// employee straight in, same as the backend's `POST /auth/claim-account`
  /// controller mirrors `POST /auth/login`.
  Future<AuthSessionModel> claimAccount(
      {required String email, required String password});

  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio _dio;
  const AuthRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<AuthSessionModel> login(
      {required String email, required String password}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed login response from server.');
      }
      return AuthSessionModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AuthSessionModel> claimAccount(
      {required String email, required String password}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.claimAccount,
        data: {'email': email, 'password': password},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException(
            'Malformed registration response from server.');
      }
      return AuthSessionModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _dio.post<void>(ApiEndpoints.logout);
    } on DioException {
      // Logout failures are non-fatal — the caller clears local session
      // state regardless, so the device is signed out either way.
    }
  }
}
