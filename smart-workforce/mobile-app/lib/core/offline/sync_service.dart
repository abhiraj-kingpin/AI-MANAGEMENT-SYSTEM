import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/offline/connectivity_service.dart';
import 'package:ai_management_system/core/offline/offline_queue_service.dart';

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
        await _queue.remove(map['clientGeneratedId'] as String);
      }
    } on DioException catch (e) {
      debugPrint('Offline sync attempt failed, will retry on next reconnect: $e');
    }
  }
}
