import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';

abstract class AttendanceRepository {
  /// Reads the device's current GPS position (requesting permission if
  /// needed) and submits a `method: 'gps'` check-in in one step — the
  /// domain layer never touches `geolocator` directly.
  Future<Result<AttendanceEntity>> checkInWithGps();

  /// Submits a `method: 'face'` check-in. The embedding and liveness
  /// verdict are computed entirely by `features/face/` before this is
  /// called — this repository only forwards them, the same separation
  /// `checkInWithGps()` keeps from `geolocator`.
  Future<Result<AttendanceEntity>> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
  });

  /// Attaches the current GPS position if it's available, but never blocks
  /// check-out on it — `location` is optional server-side for check-out,
  /// unlike check-in.
  Future<Result<AttendanceEntity>> checkOut();

  Future<Result<List<AttendanceEntity>>> getMyAttendance();
}
