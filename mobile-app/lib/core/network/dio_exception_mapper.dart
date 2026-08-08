import 'package:dio/dio.dart';
import 'package:ai_management_system/core/error/exceptions.dart';

/// Translates a [DioException] into this app's data-layer [Exception] types
/// (see core/error/exceptions.dart) — every remote data source's `catch`
/// block needs this same mapping, so it lives here once rather than
/// hand-copied into each one (the original copy lived inline in
/// AuthRemoteDataSourceImpl before Attendance needed the identical logic).
Exception mapDioException(DioException e) {
  final response = e.response;
  if (response == null) {
    return const NetworkException('No internet connection. Please try again.');
  }
  final error = response.data is Map ? (response.data as Map)['error'] as Map? : null;
  final message = error?['message'] as String? ?? 'Something went wrong. Please try again.';
  final code = error?['code'] as String?;
  return ServerException(message, code: code);
}
