import 'package:camera/camera.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/face/domain/embedding/mobile_face_net_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/liveness/blink_liveness_checker.dart';
import 'package:ai_management_system/features/face/domain/liveness/eye_state.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';

typedef OnFaceVerified = void Function({
  required List<double> embedding,
  required bool livenessPassed,
});

/// Orchestrates one face check-in attempt: initialize the front camera and
/// the embedding model, capture a short burst of still frames while the
/// user blinks naturally, run face detection on each, generate a real
/// embedding immediately for every frame that detects exactly one face
/// (kept only if it succeeds — see `FaceEmbeddingGenerator`'s doc comment
/// for why a per-frame embedding failure must never fall back mid-attempt),
/// check for a genuine blink across the whole sequence, then hand off the
/// last successfully-embedded frame's vector via [onVerified] — this
/// controller never calls the attendance API itself, mirroring how
/// `AttendanceRepositoryImpl` never touches the camera. `AttendanceController`
/// (via [onVerified]) owns everything about the actual check-in's
/// loading/success/error state.
///
/// ⚠️ [FaceEmbeddingGenerator] is UNVERIFIED — see its own doc comment.
/// This controller's own change (moving embedding generation from "once,
/// at the end, from geometry alone" to "per-frame, from real pixels,
/// immediately") is a structural consequence of that, not a change made
/// for its own sake.
class FaceCheckInController extends StateNotifier<FaceCheckInState> {
  static const _frameCount = 5;
  static const _frameInterval = Duration(milliseconds: 350);

  final CameraService _cameraService;
  final FaceDetectionService _faceDetectionService;
  final BlinkLivenessChecker _livenessChecker;
  final FaceEmbeddingGenerator _embeddingGenerator;
  final OnFaceVerified onVerified;

  FaceCheckInController({
    required CameraService cameraService,
    required FaceDetectionService faceDetectionService,
    required this.onVerified,
    BlinkLivenessChecker livenessChecker = const BlinkLivenessChecker(),
    FaceEmbeddingGenerator? embeddingGenerator,
  })  : _cameraService = cameraService,
        _faceDetectionService = faceDetectionService,
        _livenessChecker = livenessChecker,
        _embeddingGenerator = embeddingGenerator ?? FaceEmbeddingGenerator(),
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

    // Decided once, up front — not lazily on the first captured frame —
    // so every frame in this attempt sees the same real-vs-fallback
    // decision (see FaceEmbeddingGenerator's doc comment).
    await _embeddingGenerator.initialize();

    state = state.copyWith(
      stage: FaceCaptureStage.capturing,
      cameraController: controller,
      frameIndex: 0,
      totalFrames: _frameCount,
    );

    final eyeReadings = <EyeState>[];
    List<double>? lastGoodEmbedding;

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
          try {
            lastGoodEmbedding = await _embeddingGenerator.generate(path, face);
          } catch (_) {
            // This specific frame's embedding step failed (e.g. a
            // landmark ML Kit didn't detect this frame) — the eye
            // reading above still counts toward liveness, but this frame
            // doesn't update lastGoodEmbedding; try the next frame.
          }
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

    if (lastGoodEmbedding == null) {
      state = const FaceCheckInState(errorMessage: 'No face detected. Hold steady and try again.');
      return;
    }

    if (!_livenessChecker.isGenuineBlink(eyeReadings)) {
      state = const FaceCheckInState(
        errorMessage: 'Liveness check failed. Blink naturally and try again.',
      );
      return;
    }

    state = state.copyWith(stage: FaceCaptureStage.done);
    onVerified(embedding: lastGoodEmbedding, livenessPassed: true);
  }

  String _friendlyError(Object error) {
    if (error is NoFrontCameraException) return error.message;
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
