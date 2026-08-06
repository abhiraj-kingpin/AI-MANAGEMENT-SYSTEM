import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/features/auth/data/models/auth_session_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthSessionModel> login({required String email, required String password});
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio _dio;
  const AuthRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<AuthSessionModel> login({required String email, required String password}) async {
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
      throw _mapDioException(e);
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

  Exception _mapDioException(DioException e) {
    final response = e.response;
    if (response == null) {
      return const NetworkException('No internet connection. Please try again.');
    }
    final error = response.data is Map ? (response.data as Map)['error'] as Map? : null;
    final message = error?['message'] as String? ?? 'Something went wrong. Please try again.';
    final code = error?['code'] as String?;
    return ServerException(message, code: code);
  }
}
