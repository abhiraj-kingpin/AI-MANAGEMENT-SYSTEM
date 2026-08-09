import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/face/data/datasources/face_remote_datasource.dart';
import 'package:ai_management_system/features/face/data/repositories_impl/face_repository_impl.dart';
import 'package:ai_management_system/features/face/domain/repositories/face_repository.dart';
import 'package:ai_management_system/features/face/domain/usecases/get_face_registration_status_usecase.dart';
import 'package:ai_management_system/features/face/domain/usecases/register_face_embeddings_usecase.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_controller.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_state.dart';

final _faceRemoteDataSourceProvider = Provider<FaceRemoteDataSource>((ref) {
  return FaceRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final faceRepositoryProvider = Provider<FaceRepository>((ref) {
  return FaceRepositoryImpl(remoteDataSource: ref.watch(_faceRemoteDataSourceProvider));
});

/// `.autoDispose`, same reasoning as `faceCheckInControllerProvider` — this
/// holds a live camera session that should release the moment the
/// registration screen is left, not linger for the app's lifetime.
final faceRegistrationControllerProvider =
    StateNotifierProvider.autoDispose<FaceRegistrationController, FaceRegistrationState>((ref) {
  final repository = ref.watch(faceRepositoryProvider);
  final controller = FaceRegistrationController(
    cameraService: CameraService(),
    faceDetectionService: FaceDetectionService(),
    registerUseCase: RegisterFaceEmbeddingsUseCase(repository),
    statusUseCase: GetFaceRegistrationStatusUseCase(repository),
  );
  ref.onDispose(controller.dispose);
  return controller;
});
