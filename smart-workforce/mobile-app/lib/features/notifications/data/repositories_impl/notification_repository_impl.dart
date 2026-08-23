import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/notifications/data/datasources/notification_remote_datasource.dart';
import 'package:ai_management_system/features/notifications/domain/entities/notification_entity.dart';
import 'package:ai_management_system/features/notifications/domain/repositories/notification_repository.dart';

class NotificationRepositoryImpl implements NotificationRepository {
  final NotificationRemoteDataSource _remoteDataSource;
  const NotificationRepositoryImpl({required NotificationRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<NotificationEntity>>> getMyNotifications({bool unreadOnly = false}) async {
    try {
      return Success(await _remoteDataSource.getMyNotifications(unreadOnly: unreadOnly));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<NotificationEntity>> markRead(String id) async {
    try {
      return Success(await _remoteDataSource.markRead(id));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<int>> markAllRead() async {
    try {
      return Success(await _remoteDataSource.markAllRead());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }
}
