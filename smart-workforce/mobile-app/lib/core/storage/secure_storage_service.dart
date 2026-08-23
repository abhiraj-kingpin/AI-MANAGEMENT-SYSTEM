import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userKey = 'cached_user';

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required String userJson,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
      _storage.write(key: _userKey, value: userJson),
    ]);
  }

  Future<void> saveAccessToken(String accessToken) =>
      _storage.write(key: _accessTokenKey, value: accessToken);

  /// The backend rotates the refresh token on every /auth/refresh call
  /// (issueSession replaces the stored hash each time) — the old one stops
  /// working the moment a new one is issued, so any code path that calls
  /// refresh must persist the returned refresh token too, not just the new
  /// access token, or the *next* refresh will fail with SESSION_REVOKED.
  Future<void> saveRefreshToken(String refreshToken) =>
      _storage.write(key: _refreshTokenKey, value: refreshToken);

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<String?> readCachedUserJson() => _storage.read(key: _userKey);

  /// Updates just the cached user/employee blob, leaving the tokens as they
  /// are — used to self-heal a session cached before HR had linked this
  /// account to an employee record yet (see AuthRepositoryImpl.refreshEmployeeLink).
  Future<void> saveCachedUserJson(String userJson) =>
      _storage.write(key: _userKey, value: userJson);

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _userKey),
    ]);
  }
}
