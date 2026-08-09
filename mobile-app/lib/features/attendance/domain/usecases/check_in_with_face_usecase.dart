import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

class CheckInWithFaceUseCase {
  final AttendanceRepository _repository;
  const CheckInWithFaceUseCase(this._repository);

  Future<Result<AttendanceEntity>> call({
    required List<double> embedding,
    required bool livenessPassed,
  }) {
    return _repository.checkInWithFace(embedding: embedding, livenessPassed: livenessPassed);
  }
}
