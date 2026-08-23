import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

class BreakStartUseCase {
  final AttendanceRepository _repository;
  const BreakStartUseCase(this._repository);

  Future<Result<AttendanceEntity>> call() => _repository.breakStart();
}
