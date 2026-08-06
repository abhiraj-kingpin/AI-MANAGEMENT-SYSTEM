/// Data-layer exceptions — thrown by data sources, caught and translated
/// into [Failure]s by the repository implementation.
class ServerException implements Exception {
  final String message;
  final String? code;
  const ServerException(this.message, {this.code});
}

class NetworkException implements Exception {
  final String message;
  const NetworkException(this.message);
}

class CacheException implements Exception {
  final String message;
  const CacheException(this.message);
}
