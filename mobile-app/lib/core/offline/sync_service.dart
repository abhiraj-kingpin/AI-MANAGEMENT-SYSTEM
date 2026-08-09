import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/offline/connectivity_service.dart';
import 'package:ai_management_system/core/offline/offline_queue_service.dart';

/// Drains the offline punch queue against `POST /attendance/sync` whenever
/// the device regains connectivity. One failure to sync isn't fatal — the
/// queue simply keeps that punch and tries again on the next reconnect,
/// same as the backend's own sync endpoint tolerates one bad punch in a
/// batch without failing the rest (see attendance.service.ts#applySyncPunch).
class SyncService {
  final Dio _dio;
  final OfflineQueueService _queue;
  final ConnectivityService _connectivity;
  StreamSubscription<bool>? _subscription;

  SyncService({
    required Dio dio,
    required OfflineQueueService queue,
    required ConnectivityService connectivity,
  })  : _dio = dio,
        _queue = queue,
        _connectivity = connectivity;

  /// Starts listening for reconnects and attempts an immediate sync in case
  /// there's already a queue from before this listener was ever set up
  /// (e.g. the app was killed while offline and relaunched already online).
  void start() {
    _subscription ??= _connectivity.onConnected.listen((_) => syncPending());
    syncPending();
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
  }

  Future<void> syncPending() async {
    if (!await _connectivity.isOnline) return;

    final pending = await _queue.getAll();
    if (pending.isEmpty) return;

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.attendanceSync,
        data: {'punches': pending.map((p) => p.toSyncPayload()).toList()},
      );
      final results = response.data?['data'] as List<dynamic>? ?? const [];
      for (final result in results) {
        final map = result as Map<String, dynamic>;
        // Every terminal status (applied, duplicate, or a definitive
        // business-rule conflict) is removed — a conflict retrying with the
        // same stale data would just fail the same way again.
        await _queue.remove(map['clientGeneratedId'] as String);
      }
    } on DioException catch (e) {
      // No connectivity after all, or a transient server error — leave the
      // queue intact, the next reconnect (or app restart's initial
      // `start()` call) retries it. debugPrint rather than a logging
      // package this project doesn't have — no-ops outside debug builds.
      debugPrint('Offline sync attempt failed, will retry on next reconnect: $e');
    }
  }
}
