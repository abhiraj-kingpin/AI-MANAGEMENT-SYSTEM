import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';

/// Thin wrapper around [Dio] that injects the access token on every request
/// and transparently refreshes it once on a 401 before retrying — mirrors
/// the web admin dashboard's axios interceptor
/// (admin-dashboard/src/shared/lib/axios.ts) and
/// docs/architecture/07-authentication-flow.md §3.
class DioClient {
  final Dio dio;
  final SecureStorageService _secureStorage;

  DioClient({required SecureStorageService secureStorage})
      : _secureStorage = secureStorage,
        dio = Dio(
          BaseOptions(
            baseUrl: ApiEndpoints.baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(_authInterceptor());
  }

  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _secureStorage.readAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final requestOptions = error.requestOptions;
        final alreadyRetried = requestOptions.extra['retried'] == true;

        if (error.response?.statusCode == 401 && !alreadyRetried) {
          final newAccessToken = await _tryRefreshToken();
          if (newAccessToken != null) {
            requestOptions.extra['retried'] = true;
            requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            try {
              final response = await dio.fetch<dynamic>(requestOptions);
              handler.resolve(response);
              return;
            } on DioException catch (retryError) {
              handler.next(retryError);
              return;
            }
          }
        }
        handler.next(error);
      },
    );
  }

  Future<String?> _tryRefreshToken() async {
    final refreshToken = await _secureStorage.readRefreshToken();
    if (refreshToken == null) return null;

    try {
      // A bare Dio instance without interceptors — a failed refresh must
      // never itself trigger another refresh attempt.
      final refreshClient = Dio(BaseOptions(baseUrl: ApiEndpoints.baseUrl));
      final response = await refreshClient.post<Map<String, dynamic>>(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final newAccessToken = data?['accessToken'] as String?;
      if (newAccessToken == null) return null;

      await _secureStorage.saveAccessToken(newAccessToken);
      return newAccessToken;
    } on DioException {
      await _secureStorage.clearSession();
      return null;
    }
  }
}
