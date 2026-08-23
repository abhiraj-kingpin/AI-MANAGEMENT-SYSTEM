import 'package:camera/camera.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/face/domain/embedding/mobile_face_net_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/liveness/head_pose.dart';
import 'package:ai_management_system/features/face/domain/liveness/head_turn_liveness_checker.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';

typedef OnFaceVerified = void Function({
  required List<double> embedding,
  required bool livenessPassed,
});

class _PoseCapture {
  final List<double> embedding;
  final double yaw;
  const _PoseCapture({required this.embedding, required this.yaw});
}

class FaceCheckInController extends StateNotifier<FaceCheckInState> {
  final CameraService _cameraService;
  final FaceDetectionService _faceDetectionService;
  final HeadTurnLivenessChecker _livenessChecker;
  final FaceEmbeddingGenerator _embeddingGenerator;
  final OnFaceVerified onVerified;

  final Map<FacePose, _PoseCapture> _captured = {};

  FaceCheckInController({
    required CameraService cameraService,
    required FaceDetectionService faceDetectionService,
    required this.onVerified,
    HeadTurnLivenessChecker livenessChecker = const HeadTurnLivenessChecker(),
    FaceEmbeddingGenerator? embeddingGenerator,
  })  : _cameraService = cameraService,
        _faceDetectionService = faceDetectionService,
        _livenessChecker = livenessChecker,
        _embeddingGenerator = embeddingGenerator ?? FaceEmbeddingGenerator(),
        super(const FaceCheckInState());

  Future<void> start() async {
    _captured.clear();
    state = const FaceCheckInState(stage: FaceCaptureStage.initializingCamera);

    CameraController controller;
    try {
      controller = await _cameraService.initializeFrontCamera();
    } catch (e) {
      state = FaceCheckInState(errorMessage: _friendlyError(e));
      return;
    }

    await _embeddingGenerator.initialize();

    state = state.copyWith(
      stage: FaceCaptureStage.awaitingCapture,
      pose: FacePose.front,
      cameraController: controller,
    );
  }

  Future<void> captureCurrentPose() async {
    state = state.copyWith(
        stage: FaceCaptureStage.processingCapture, errorMessage: null,);

    String path;
    try {
      path = await _cameraService.capture();
    } catch (_) {
      _retryCurrentPose('Could not take that photo. Try again.');
      return;
    }

    final faces = await _faceDetectionService.detectFromFilePath(path);
    if (faces.length != 1) {
      _retryCurrentPose(
        faces.isEmpty
            ? 'No face detected. Make sure your whole face is in view.'
            : 'More than one face detected. Make sure only you are in frame.',
      );
      return;
    }

    final face = faces.single;
    final yaw = estimateYawProxy(face);
    if (yaw == null) {
      _retryCurrentPose(
          'Could not read head position — try again in better light.',);
      return;
    }

    // Front-only capture — no head-turn liveness sequence, so alignment has
    // to be tight (see HeadTurnLivenessChecker.centerThreshold) since this
    // single frame is the only thing being checked for both quality and
    // "is this really pointed at a face" before it's sent as the match
    // embedding.
    if (!_livenessChecker.isFacingCenter(yaw)) {
      _retryCurrentPose('Center your face and look straight at the camera.');
      return;
    }

    List<double> embedding;
    try {
      embedding = await _embeddingGenerator.generate(path, face);
    } catch (_) {
      _retryCurrentPose('Could not process that photo. Try again.');
      return;
    }

    _captured[FacePose.front] = _PoseCapture(embedding: embedding, yaw: yaw);
    _finish();
  }

  void _retryCurrentPose(String message) {
    state = state.copyWith(
        stage: FaceCaptureStage.awaitingCapture, errorMessage: message,);
  }

  void _finish() {
    state = state.copyWith(stage: FaceCaptureStage.verifying);
    final front = _captured[FacePose.front]!;
    state = state.copyWith(stage: FaceCaptureStage.done);
    // No head-turn liveness was performed — see face_checkin_state.dart and
    // the backend's attendance.service.ts, which no longer hard-requires
    // livenessPassed for the same reason. Identity (face match) and location
    // (geofence) are still both independently verified server-side.
    onVerified(embedding: front.embedding, livenessPassed: false);
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
