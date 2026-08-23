import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/notifications/data/models/notification_model.dart';

abstract class NotificationRemoteDataSource {
  Future<List<NotificationModel>> getMyNotifications({required bool unreadOnly});
  Future<NotificationModel> markRead(String id);
  Future<int> markAllRead();
}

class NotificationRemoteDataSourceImpl implements NotificationRemoteDataSource {
  final Dio _dio;
  const NotificationRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<List<NotificationModel>> getMyNotifications({required bool unreadOnly}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.myNotifications,
        queryParameters: {if (unreadOnly) 'unread': 'true', 'limit': 50},
      );
      final data = response.data?['data'] as List<dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed notifications response from server.');
      }
      return data
          .map((item) => NotificationModel.fromJson(item as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<NotificationModel> markRead(String id) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.markNotificationRead(id),
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final notification = data?['notification'] as Map<String, dynamic>?;
      if (notification == null) {
        throw const ServerException('Malformed notification response from server.');
      }
      return NotificationModel.fromJson(notification);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<int> markAllRead() async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.markAllNotificationsRead,
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final count = data?['count'] as int?;
      if (count == null) {
        throw const ServerException('Malformed response from server.');
      }
      return count;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
