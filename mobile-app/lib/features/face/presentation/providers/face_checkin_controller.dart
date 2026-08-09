import 'package:camera/camera.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/face/domain/embedding/geometric_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/liveness/blink_liveness_checker.dart';
import 'package:ai_management_system/features/face/domain/liveness/eye_state.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';

typedef OnFaceVerified = void Function({
  required List<double> embedding,
  required bool livenessPassed,
});

/// Orchestrates one face check-in attempt: initialize the front camera,
/// capture a short burst of still frames while the user blinks naturally,
/// run face detection on each, check for a genuine blink across the
/// sequence, then generate an embedding from the last good frame and hand
/// it off via [onVerified] — this controller never calls the attendance
/// API itself, mirroring how `AttendanceRepositoryImpl` never touches the
/// camera. `AttendanceController` (via [onVerified]) owns everything about
/// the actual check-in's loading/success/error state.
class FaceCheckInController extends StateNotifier<FaceCheckInState> {
  static const _frameCount = 5;
  static const _frameInterval = Duration(milliseconds: 350);

  final CameraService _cameraService;
  final FaceDetectionService _faceDetectionService;
  final BlinkLivenessChecker _livenessChecker;
  final GeometricEmbeddingGenerator _embeddingGenerator;
  final OnFaceVerified onVerified;

  FaceCheckInController({
    required CameraService cameraService,
    required FaceDetectionService faceDetectionService,
    required this.onVerified,
    BlinkLivenessChecker livenessChecker = const BlinkLivenessChecker(),
    GeometricEmbeddingGenerator embeddingGenerator = const GeometricEmbeddingGenerator(),
  })  : _cameraService = cameraService,
        _faceDetectionService = faceDetectionService,
        _livenessChecker = livenessChecker,
        _embeddingGenerator = embeddingGenerator,
        super(const FaceCheckInState());

  Future<void> start() async {
    state = const FaceCheckInState(stage: FaceCaptureStage.initializingCamera);

    CameraController controller;
    try {
      controller = await _cameraService.initializeFrontCamera();
    } catch (e) {
      state = FaceCheckInState(errorMessage: _friendlyError(e));
      return;
    }

    state = state.copyWith(
      stage: FaceCaptureStage.capturing,
      cameraController: controller,
      frameIndex: 0,
      totalFrames: _frameCount,
    );

    final eyeReadings = <EyeState>[];
    DetectedFace? lastGoodFace;

    for (var i = 0; i < _frameCount; i++) {
      state = state.copyWith(frameIndex: i + 1);
      try {
        final path = await _cameraService.capture();
        final faces = await _faceDetectionService.detectFromFilePath(path);
        if (faces.length == 1) {
          final face = faces.single;
          eyeReadings.add(
            EyeState(
              leftOpenProbability: face.leftEyeOpenProbability,
              rightOpenProbability: face.rightEyeOpenProbability,
            ),
          );
          lastGoodFace = face;
        }
        // Zero or multiple faces: skip this frame rather than aborting the
        // whole attempt — a single bad frame (blink-timed miss, hand
        // shake, someone briefly walking through frame) shouldn't cost the
        // user the entire capture.
      } catch (_) {
        // Same reasoning — one failed capture/detect call isn't fatal.
      }
      if (i < _frameCount - 1) {
        await Future<void>.delayed(_frameInterval);
      }
    }

    state = state.copyWith(stage: FaceCaptureStage.verifying);

    if (lastGoodFace == null) {
      state = const FaceCheckInState(errorMessage: 'No face detected. Hold steady and try again.');
      return;
    }

    if (!_livenessChecker.isGenuineBlink(eyeReadings)) {
      state = const FaceCheckInState(
        errorMessage: 'Liveness check failed. Blink naturally and try again.',
      );
      return;
    }

    final embedding = _embeddingGenerator.generate(lastGoodFace);
    state = state.copyWith(stage: FaceCaptureStage.done);
    onVerified(embedding: embedding, livenessPassed: true);
  }

  String _friendlyError(Object error) {
    if (error is NoFrontCameraException) return error.message;
    return 'Could not start the camera. Please try again.';
  }

  @override
  void dispose() {
    _cameraService.dispose();
    _faceDetectionService.dispose();
    super.dispose();
  }
}
