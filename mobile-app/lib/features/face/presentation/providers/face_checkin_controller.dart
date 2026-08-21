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

/// Orchestrates one face check-in attempt as three explicitly user-paced
/// captures — look straight at the camera, tap Capture; turn your head one
/// way, tap Capture; turn it the other way, tap Capture — rather than a
/// single unattended burst.
///
/// This replaced a blink-based design (initialize camera + embedding
/// model, capture a fixed burst of stills over ~1.4s, hope one of them
/// landed during a natural blink's closed-eye instant) that failed on
/// close to every real attempt: each captured "frame" was a full
/// still-photo `takePicture()` call, not a cheap preview tick, so the real
/// gap between samples (capture time + ML Kit detection time) regularly
/// exceeded how long a genuine blink's closed-eye moment actually lasts.
/// Head pose sidesteps that entirely — nothing here is racing a fast
/// involuntary reflex. The user confirms each pose themselves, so a
/// capture only ever happens once they're already holding it.
///
/// Still doesn't touch the camera-agnostic parts of the original design:
/// this controller never calls the attendance API itself (mirroring how
/// `AttendanceRepositoryImpl` never touches the camera) — once the third
/// pose is verified, the front pose's embedding is handed to
/// [onVerified], and `AttendanceController` owns everything about the
/// actual check-in's loading/success/error state.
///
/// [FaceEmbeddingGenerator] was written blind and confirmed by
/// `ci-mobile.yml` — see its own doc comment for what that found and
/// what's still genuinely unverified (real-world accuracy on a device).
class FaceCheckInController extends StateNotifier<FaceCheckInState> {
  static const _poseOrder = [FacePose.front, FacePose.left, FacePose.right];

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

    // Decided once, up front — every pose in this attempt sees the same
    // real-vs-fallback decision (see FaceEmbeddingGenerator's doc comment).
    await _embeddingGenerator.initialize();

    state = state.copyWith(
      stage: FaceCaptureStage.awaitingCapture,
      pose: FacePose.front,
      cameraController: controller,
    );
  }

  /// Called when the user taps "Capture" for whichever pose is currently
  /// shown. Validates the shot against that pose's requirement; on
  /// failure, stays on the same pose with a specific reason so the user
  /// knows what to fix, rather than restarting the whole attempt over one
  /// bad frame.
  Future<void> captureCurrentPose() async {
    state = state.copyWith(
        stage: FaceCaptureStage.processingCapture, errorMessage: null);

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
          'Could not read head position — try again in better light.');
      return;
    }

    final pose = state.pose;
    if (pose == FacePose.front && !_livenessChecker.isFacingCenter(yaw)) {
      _retryCurrentPose('Please look straight at the camera.');
      return;
    }
    final frontYaw = _captured[FacePose.front]?.yaw;
    if (pose != FacePose.front &&
        frontYaw != null &&
        !_livenessChecker.isTurnedAwayFromFront(yaw, frontYaw)) {
      _retryCurrentPose(
        pose == FacePose.left
            ? 'Turn your head further to one side.'
            : 'Turn your head further to the other side.',
      );
      return;
    }

    List<double> embedding;
    try {
      embedding = await _embeddingGenerator.generate(path, face);
    } catch (_) {
      _retryCurrentPose('Could not process that photo. Try again.');
      return;
    }

    _captured[pose] = _PoseCapture(embedding: embedding, yaw: yaw);
    _advance();
  }

  void _retryCurrentPose(String message) {
    state = state.copyWith(
        stage: FaceCaptureStage.awaitingCapture, errorMessage: message);
  }

  void _advance() {
    final nextIndex = _poseOrder.indexOf(state.pose) + 1;
    if (nextIndex < _poseOrder.length) {
      state = state.copyWith(
        stage: FaceCaptureStage.awaitingCapture,
        pose: _poseOrder[nextIndex],
      );
      return;
    }
    _finish();
  }

  void _finish() {
    state = state.copyWith(stage: FaceCaptureStage.verifying);

    final front = _captured[FacePose.front]!;
    final left = _captured[FacePose.left]!;
    final right = _captured[FacePose.right]!;

    final genuine = _livenessChecker.isGenuineTurnSequence(
      frontYawProxy: front.yaw,
      turnOneYawProxy: left.yaw,
      turnTwoYawProxy: right.yaw,
    );
    if (!genuine) {
      // Each pose already passed its own individual check as it was
      // captured — reaching here without a genuine sequence means the two
      // turns matched each other too closely to be real opposite-direction
      // motion (see isGenuineTurnSequence). Start over rather than retry
      // one pose, since it's the *relationship* between poses that failed.
      _captured.clear();
      state = const FaceCheckInState(
        errorMessage:
            "That didn't read as two turns in different directions. Please try all three "
            'steps again.',
      );
      return;
    }

    state = state.copyWith(stage: FaceCaptureStage.done);
    // The front pose's embedding is what actually gets compared
    // server-side — most directly comparable to a front-facing
    // registration photo, and the left/right captures have already served
    // their purpose (proving a real, moving head was present).
    onVerified(embedding: front.embedding, livenessPassed: true);
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
