import 'dart:convert';

/// Reads claims out of a JWT's payload segment without verifying the
/// signature — the app never trusts this for authorization (the backend
/// re-validates every request), it's only used client-side to decide
/// whether a *cached* access token is stale, e.g. missing `employeeId`
/// because it was issued before HR linked the account to an employee.
/// See AuthRepositoryImpl.refreshEmployeeLink and CheckSessionUseCase.
class JwtUtils {
  JwtUtils._();

  static Map<String, dynamic>? decodePayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    try {
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      switch (payload.length % 4) {
        case 2:
          payload += '==';
        case 3:
          payload += '=';
      }
      final decoded = utf8.decode(base64.decode(payload));
      final map = jsonDecode(decoded);
      return map is Map<String, dynamic> ? map : null;
    } catch (_) {
      return null;
    }
  }

  /// True if the token's payload has a non-empty `employeeId` claim.
  static bool hasEmployeeId(String token) {
    final claims = decodePayload(token);
    final value = claims?['employeeId'];
    return value is String && value.isNotEmpty;
  }
}
