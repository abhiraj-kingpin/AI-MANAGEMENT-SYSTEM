import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/services/location_service.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/data/datasources/attendance_remote_datasource.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource _remoteDataSource;
  final LocationService _locationService;

  const AttendanceRepositoryImpl({
    required AttendanceRemoteDataSource remoteDataSource,
    required LocationService locationService,
  })  : _remoteDataSource = remoteDataSource,
        _locationService = locationService;

  @override
  Future<Result<AttendanceEntity>> checkInWithGps() async {
    try {
      final position = await _locationService.getCurrentPosition();
      final attendance = await _remoteDataSource.checkIn(
        lat: position.latitude,
        lng: position.longitude,
        accuracyMeters: position.accuracy,
      );
      return Success(attendance);
    } on LocationServiceDisabledError catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    } on LocationPermissionDeniedException catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<AttendanceEntity>> checkOut() async {
    try {
      // Check-out's location is optional server-side — a permission revoked
      // (or GPS turned off) between check-in and check-out shouldn't block
      // it the way it blocks check-in.
      double? lat;
      double? lng;
      double? accuracyMeters;
      try {
        final position = await _locationService.getCurrentPosition();
        lat = position.latitude;
        lng = position.longitude;
        accuracyMeters = position.accuracy;
      } catch (_) {
        // Fall through with no location — see comment above.
      }

      final attendance = await _remoteDataSource.checkOut(
        lat: lat,
        lng: lng,
        accuracyMeters: accuracyMeters,
      );
      return Success(attendance);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<List<AttendanceEntity>>> getMyAttendance() async {
    try {
      final list = await _remoteDataSource.getMyAttendance();
      return Success(list);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }
}
