import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

class CheckOutUseCase {
  final AttendanceRepository _repository;
  const CheckOutUseCase(this._repository);

  Future<Result<AttendanceEntity>> call() => _repository.checkOut();
}
