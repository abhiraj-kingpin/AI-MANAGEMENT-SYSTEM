import 'dart:math';

import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/offline/offline_queue_service.dart';
import 'package:ai_management_system/core/offline/pending_punch.dart';
import 'package:ai_management_system/core/services/location_service.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/attendance/data/datasources/attendance_remote_datasource.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';

final _random = Random();

/// Not a formal UUID (this project has no `uuid` package as a direct
/// dependency, only transitively) — just unique enough client-side for
/// `POST /attendance/sync`'s deduplication key, which only needs to be
/// unique per-device, not globally.
String _generateClientId() {
  return '${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 32)}';
}

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource _remoteDataSource;
  final LocationService _locationService;
  final OfflineQueueService _offlineQueue;

  const AttendanceRepositoryImpl({
    required AttendanceRemoteDataSource remoteDataSource,
    required LocationService locationService,
    required OfflineQueueService offlineQueue,
  })  : _remoteDataSource = remoteDataSource,
        _locationService = locationService,
        _offlineQueue = offlineQueue;

  @override
  Future<Result<AttendanceEntity>> checkInWithGps() async {
    try {
      final position = await _locationService.getCurrentPosition();
      try {
        final attendance = await _remoteDataSource.checkIn(
          lat: position.latitude,
          lng: position.longitude,
          accuracyMeters: position.accuracy,
        );
        return Success(attendance);
      } on NetworkException {
        // GPS worked, but the request itself couldn't reach the server —
        // queue it rather than losing the punch. Unlike check-out, GPS is
        // required for check-in, so this branch always has a real position
        // to enqueue with.
        await _offlineQueue.enqueue(
          PendingPunch(
            clientGeneratedId: _generateClientId(),
            type: 'check_in',
            method: 'gps',
            lat: position.latitude,
            lng: position.longitude,
            accuracyMeters: position.accuracy,
            occurredAt: DateTime.now(),
          ),
        );
        return const ResultFailure(
          OfflineQueuedFailure('No connection — check-in queued, will sync automatically.'),
        );
      }
    } on LocationServiceDisabledError catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    } on LocationPermissionDeniedException catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    }
  }

  @override
  Future<Result<AttendanceEntity>> checkOut() async {
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

    try {
      final attendance = await _remoteDataSource.checkOut(
        lat: lat,
        lng: lng,
        accuracyMeters: accuracyMeters,
      );
      return Success(attendance);
    } on NetworkException {
      await _offlineQueue.enqueue(
        PendingPunch(
          clientGeneratedId: _generateClientId(),
          type: 'check_out',
          lat: lat,
          lng: lng,
          accuracyMeters: accuracyMeters,
          occurredAt: DateTime.now(),
        ),
      );
      return const ResultFailure(
        OfflineQueuedFailure('No connection — check-out queued, will sync automatically.'),
      );
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
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
