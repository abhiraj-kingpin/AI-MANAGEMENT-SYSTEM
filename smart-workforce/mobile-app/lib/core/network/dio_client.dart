import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';

class DioClient {
  final Dio dio;
  final SecureStorageService _secureStorage;

  DioClient({required SecureStorageService secureStorage})
      : _secureStorage = secureStorage,
        dio = Dio(
          BaseOptions(
            baseUrl: ApiEndpoints.baseUrl,
            // Render's free tier spins the backend down after inactivity and
            // can take 50+s to wake back up on the next request — 15s here
            // meant a cold backend looked exactly like "no internet" to the
            // app even though it was already correctly reachable.
            connectTimeout: const Duration(seconds: 60),
            receiveTimeout: const Duration(seconds: 60),
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
      final refreshClient = Dio(BaseOptions(baseUrl: ApiEndpoints.baseUrl));
      final response = await refreshClient.post<Map<String, dynamic>>(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final newAccessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (newAccessToken == null || newRefreshToken == null) return null;

      // The backend rotates the refresh token on every /auth/refresh call —
      // the old one stops working the instant a new one is issued. Only
      // saving the access token here left the stored refresh token stale
      // after the first reactive refresh, so the *next* 401 would fail with
      // SESSION_REVOKED instead of silently refreshing.
      await _secureStorage.saveAccessToken(newAccessToken);
      await _secureStorage.saveRefreshToken(newRefreshToken);
      return newAccessToken;
    } on DioException catch (e) {
      // Only a real 401 from the refresh endpoint means the backend
      // explicitly rejected the refresh token (expired/revoked/invalid) —
      // that's the one case that should force a re-login. Anything else
      // (a timeout, no connection, a 5xx, Render's free-tier cold start
      // sometimes exceeding even this client's 60s timeout) is transient
      // and must NOT wipe a session that might still be perfectly valid —
      // that was forcing employees back to the sign-in screen just because
      // the network hiccuped or the backend was slow to wake up, not
      // because their session actually expired.
      if (e.response?.statusCode == 401) {
        await _secureStorage.clearSession();
      }
      return null;
    }
  }
}
