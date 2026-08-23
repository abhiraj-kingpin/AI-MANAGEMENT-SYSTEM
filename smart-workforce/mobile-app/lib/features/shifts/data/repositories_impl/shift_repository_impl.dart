import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/shifts/data/datasources/shift_remote_datasource.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';
import 'package:ai_management_system/features/shifts/domain/repositories/shift_repository.dart';

class ShiftRepositoryImpl implements ShiftRepository {
  final ShiftRemoteDataSource _remoteDataSource;
  const ShiftRepositoryImpl({required ShiftRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<ShiftAssignmentEntity?>> getMyShift() async {
    try {
      return Success(await _remoteDataSource.getMyShift());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }
}
