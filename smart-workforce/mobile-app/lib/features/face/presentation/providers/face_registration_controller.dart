import 'package:camera/camera.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/face/domain/embedding/mobile_face_net_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/usecases/get_face_registration_status_usecase.dart';
import 'package:ai_management_system/features/face/domain/usecases/register_face_embeddings_usecase.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_state.dart';

class FaceRegistrationController extends StateNotifier<FaceRegistrationState> {
  static const _maxFrames = 5;
  static const _minFrames = 3;
  static const _frameInterval = Duration(milliseconds: 400);

  final CameraService _cameraService;
  final FaceDetectionService _faceDetectionService;
  final RegisterFaceEmbeddingsUseCase _registerUseCase;
  final GetFaceRegistrationStatusUseCase _statusUseCase;
  final FaceEmbeddingGenerator _embeddingGenerator;

  FaceRegistrationController({
    required CameraService cameraService,
    required FaceDetectionService faceDetectionService,
    required RegisterFaceEmbeddingsUseCase registerUseCase,
    required GetFaceRegistrationStatusUseCase statusUseCase,
    FaceEmbeddingGenerator? embeddingGenerator,
  })  : _cameraService = cameraService,
        _faceDetectionService = faceDetectionService,
        _registerUseCase = registerUseCase,
        _statusUseCase = statusUseCase,
        _embeddingGenerator = embeddingGenerator ?? FaceEmbeddingGenerator(),
        super(const FaceRegistrationState()) {
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    state = state.copyWith(isLoadingStatus: true);
    final result = await _statusUseCase();
    result.when(
      success: (status) => state = state.copyWith(status: status, isLoadingStatus: false),
      failure: (_) => state = state.copyWith(isLoadingStatus: false),
    );
  }

  Future<void> startCapture() async {
    state = state.copyWith(
      stage: FaceRegistrationStage.initializingCamera,
      errorMessage: null,
      successMessage: null,
    );

    CameraController controller;
    try {
      controller = await _cameraService.initializeFrontCamera();
    } catch (e) {
      state = state.copyWith(
        stage: FaceRegistrationStage.idle,
        errorMessage: _friendlyError(e),
      );
      return;
    }

    await _embeddingGenerator.initialize();

    state = state.copyWith(
      stage: FaceRegistrationStage.capturing,
      cameraController: controller,
      capturedCount: 0,
      requiredFrames: _maxFrames,
    );

    final embeddings = <List<double>>[];

    for (var i = 0; i < _maxFrames; i++) {
      try {
        final path = await _cameraService.capture();
        final faces = await _faceDetectionService.detectFromFilePath(path);
        if (faces.length == 1) {
          embeddings.add(await _embeddingGenerator.generate(path, faces.single));
          state = state.copyWith(capturedCount: embeddings.length);
        }
      } catch (_) {
      }
      if (i < _maxFrames - 1) {
        await Future<void>.delayed(_frameInterval);
      }
    }

    if (embeddings.length < _minFrames) {
      state = state.copyWith(
        stage: FaceRegistrationStage.idle,
        errorMessage:
            'Only captured ${embeddings.length} clear photo(s) — need at least $_minFrames. '
            'Make sure just your face is in view, in good light, and try again.',
      );
      return;
    }

    state = state.copyWith(stage: FaceRegistrationStage.submitting);
    final result = await _registerUseCase(embeddings);
    result.when(
      success: (registered) {
        state = state.copyWith(
          stage: FaceRegistrationStage.done,
          successMessage: 'Face registered from ${registered.embeddingCount} photo(s).',
        );
        _loadStatus();
      },
      failure: (failure) {
        state = state.copyWith(
          stage: FaceRegistrationStage.idle,
          errorMessage: failure.message,
        );
      },
    );
  }

  String _friendlyError(Object error) {
    if (error is NoFrontCameraException) return error.message;
    if (error is CameraPermissionDeniedException) return error.message;
    return 'Could not start the camera. Please try again.';
  }

  @override
  void dispose() {
    _cameraService.dispose();
    _faceDetectionService.dispose();
    _embeddingGenerator.dispose();
    super.dispose();
  }
}
