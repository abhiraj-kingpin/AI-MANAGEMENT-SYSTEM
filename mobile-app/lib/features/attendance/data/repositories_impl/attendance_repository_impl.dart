import 'dart:math';

import 'package:geolocator/geolocator.dart';
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
        final attendance = await _remoteDataSource.checkInWithGps(
          lat: position.latitude,
          lng: position.longitude,
          accuracyMeters: position.accuracy,
        );
        return Success(attendance);
      } on NetworkException {
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
  Future<Result<AttendanceEntity>> checkInWithQr(String qrToken) async {
    try {
      final attendance = await _remoteDataSource.checkInWithQr(qrToken: qrToken);
      return Success(attendance);
    } on NetworkException {
      await _offlineQueue.enqueue(
        PendingPunch(
          clientGeneratedId: _generateClientId(),
          type: 'check_in',
          method: 'qr',
          qrToken: qrToken,
          occurredAt: DateTime.now(),
        ),
      );
      return const ResultFailure(
        OfflineQueuedFailure('No connection — check-in queued, will sync automatically.'),
      );
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    }
  }

  @override
  Future<Result<AttendanceEntity>> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
  }) async {
    // Face check-in proves who you are, not where you are — it requires the
    // same geofence proof GPS check-in does, fetched the same way.
    final Position position;
    try {
      position = await _locationService.getCurrentPosition();
    } on LocationServiceDisabledError catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    } on LocationPermissionDeniedException catch (e) {
      return ResultFailure(ValidationFailure(e.message));
    }

    try {
      final attendance = await _remoteDataSource.checkInWithFace(
        embedding: embedding,
        livenessPassed: livenessPassed,
        lat: position.latitude,
        lng: position.longitude,
        accuracyMeters: position.accuracy,
      );
      return Success(attendance);
    } on NetworkException {
      await _offlineQueue.enqueue(
        PendingPunch(
          clientGeneratedId: _generateClientId(),
          type: 'check_in',
          method: 'face',
          faceEmbedding: embedding,
          livenessPassed: livenessPassed,
          lat: position.latitude,
          lng: position.longitude,
          accuracyMeters: position.accuracy,
          occurredAt: DateTime.now(),
        ),
      );
      return const ResultFailure(
        OfflineQueuedFailure('No connection — check-in queued, will sync automatically.'),
      );
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    }
  }

  @override
  Future<Result<AttendanceEntity>> checkOut() async {
    double? lat;
    double? lng;
    double? accuracyMeters;
    try {
      final position = await _locationService.getCurrentPosition();
      lat = position.latitude;
      lng = position.longitude;
      accuracyMeters = position.accuracy;
    } catch (_) {
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
  Future<Result<AttendanceEntity>> breakStart() async {
    try {
      final attendance = await _remoteDataSource.breakStart();
      return Success(attendance);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      // Breaks aren't offline-queued (unlike check-in/out) — a short gap in
      // connectivity right at the office door is the realistic case those
      // exist for; a mid-day break action failing here just needs a retry.
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<AttendanceEntity>> breakEnd() async {
    try {
      final attendance = await _remoteDataSource.breakEnd();
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
