import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart'
    show ServerException;
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/auth/data/models/auth_session_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthSessionModel> login(
      {required String email, required String password,});

  Future<AuthSessionModel> claimAccount(
      {required String email, required String password,});

  Future<void> logout();

  /// Freshly re-checks who the current token belongs to and whether it's
  /// linked to an employee yet — GET /auth/me, not part of the login
  /// response. Used to heal a session cached from before that link existed.
  Future<Map<String, dynamic>> getMe();

  /// Exchanges a refresh token for a new token pair. The backend re-derives
  /// the employee link from the database on every refresh (see
  /// auth.service.ts `refresh()`), so this is also how a session that was
  /// cached before the employee link existed gets an access token that
  /// actually carries `employeeId` — see AuthRepositoryImpl.refreshEmployeeLink.
  /// The backend also rotates the refresh token on every call (issueSession
  /// replaces the stored hash) — callers must persist both returned tokens,
  /// not just the access token, or the next refresh will fail.
  Future<({String accessToken, String refreshToken})> refreshAccessToken(
      String refreshToken,);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio _dio;
  const AuthRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<AuthSessionModel> login(
      {required String email, required String password,}) async {
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
      {required String email, required String password,}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.claimAccount,
        data: {'email': email, 'password': password},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException(
            'Malformed registration response from server.',);
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
    }
  }

  @override
  Future<Map<String, dynamic>> getMe() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.me);
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed response from server.');
      }
      return data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<({String accessToken, String refreshToken})> refreshAccessToken(
      String refreshToken,) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) {
        throw const ServerException('Malformed refresh response from server.');
      }
      return (accessToken: accessToken, refreshToken: newRefreshToken);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
