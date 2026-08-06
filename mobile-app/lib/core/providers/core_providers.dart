import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/network/dio_client.dart';
import 'package:ai_management_system/core/storage/secure_storage_service.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(secureStorage: ref.watch(secureStorageProvider));
});
