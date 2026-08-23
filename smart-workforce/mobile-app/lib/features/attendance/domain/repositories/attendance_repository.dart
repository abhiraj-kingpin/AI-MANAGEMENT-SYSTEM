import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';

abstract class AttendanceRepository {
  Future<Result<AttendanceEntity>> checkInWithGps();

  Future<Result<AttendanceEntity>> checkInWithQr(String qrToken);

  Future<Result<AttendanceEntity>> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
  });

  Future<Result<AttendanceEntity>> checkOut();

  Future<Result<AttendanceEntity>> breakStart();

  Future<Result<AttendanceEntity>> breakEnd();

  Future<Result<List<AttendanceEntity>>> getMyAttendance();
}
