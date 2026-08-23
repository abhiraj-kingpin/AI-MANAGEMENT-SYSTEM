import 'package:dio/dio.dart';
import 'package:ai_management_system/core/error/exceptions.dart';

Exception mapDioException(DioException e) {
  final response = e.response;
  if (response == null) {
    // A missing response covers several distinct causes that all get
    // queued/retried the same way (see OfflineQueueService — it keys off
    // NetworkException specifically to decide "safe to retry later, don't
    // scare the user"), but they are NOT all "no internet": a connection
    // timeout is exactly what a cold Render backend waking up looks like
    // (see DioClient's 60s timeouts), and that has nothing to do with the
    // device's own connectivity. Claiming "no internet" there was actively
    // wrong and misleading whenever the real cause was a slow/cold backend.
    if (e.type == DioExceptionType.cancel) {
      return const NetworkException('Request cancelled.');
    }
    final isTimeout = e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout;
    final message = isTimeout
        ? 'The server is taking longer than usual to respond. Please try again in a moment.'
        : "Couldn't reach the server. Check your connection and try again.";
    return NetworkException(message);
  }
  final error = response.data is Map ? (response.data as Map)['error'] as Map? : null;
  final message = error?['message'] as String? ?? 'Something went wrong. Please try again.';
  final code = error?['code'] as String?;
  return ServerException(message, code: code);
}
