import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

class GetMyAttendanceUseCase {
  final AttendanceRepository _repository;
  const GetMyAttendanceUseCase(this._repository);

  Future<Result<List<AttendanceEntity>>> call() => _repository.getMyAttendance();
}
