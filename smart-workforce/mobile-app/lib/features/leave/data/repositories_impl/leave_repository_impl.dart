import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/data/datasources/leave_remote_datasource.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class LeaveRepositoryImpl implements LeaveRepository {
  final LeaveRemoteDataSource _remoteDataSource;
  const LeaveRepositoryImpl({required LeaveRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<LeaveTypeEntity>>> getLeaveTypes() async {
    try {
      return Success(await _remoteDataSource.getLeaveTypes());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<List<LeaveBalanceEntity>>> getMyBalance() async {
    try {
      return Success(await _remoteDataSource.getMyBalance());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<List<LeaveEntity>>> getMyLeaves() async {
    try {
      return Success(await _remoteDataSource.getMyLeaves());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<LeaveEntity>> applyLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    try {
      final leave = await _remoteDataSource.applyLeave(
        leaveTypeId: leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );
      return Success(leave);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<LeaveEntity>> cancelLeave(String leaveId) async {
    try {
      return Success(await _remoteDataSource.cancelLeave(leaveId));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }
}
