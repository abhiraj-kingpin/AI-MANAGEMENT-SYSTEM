import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/network/dio_client.dart';
import 'package:ai_management_system/core/offline/connectivity_service.dart';
import 'package:ai_management_system/core/offline/offline_queue_service.dart';
import 'package:ai_management_system/core/offline/sync_service.dart';
import 'package:ai_management_system/core/services/file_opener_service.dart';
import 'package:ai_management_system/core/services/location_service.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(secureStorage: ref.watch(secureStorageProvider));
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return const LocationService();
});

final fileOpenerServiceProvider = Provider<FileOpenerService>((ref) {
  return const FileOpenerService();
});

final offlineQueueServiceProvider = Provider<OfflineQueueService>((ref) {
  return const OfflineQueueService();
});

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService();
});

/// A `Provider` body runs once per app lifetime (cached until invalidated),
/// so starting the listener here — rather than in a widget's `build` —
/// guarantees `start()` fires exactly once no matter how many widgets
/// `ref.watch` this provider to keep it alive (see `HomeScreen`).
final syncServiceProvider = Provider<SyncService>((ref) {
  final service = SyncService(
    dio: ref.watch(dioClientProvider).dio,
    queue: ref.watch(offlineQueueServiceProvider),
    connectivity: ref.watch(connectivityServiceProvider),
  );
  service.start();
  ref.onDispose(service.dispose);
  return service;
});
