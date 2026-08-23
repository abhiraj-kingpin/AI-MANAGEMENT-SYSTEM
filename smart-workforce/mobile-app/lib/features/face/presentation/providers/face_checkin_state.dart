import 'package:camera/camera.dart';

// Front-only now (no head-turn liveness sequence) — see
// FaceCheckInController for why, and HeadTurnLivenessChecker.centerThreshold
// for the stricter alignment this relies on instead.
enum FacePose { front }

enum FaceCaptureStage {
  idle,
  initializingCamera,
  awaitingCapture,
  processingCapture,
  verifying,
  done,
}

class FaceCheckInState {
  final FaceCaptureStage stage;
  final FacePose pose;

  final CameraController? cameraController;

  final String? errorMessage;

  const FaceCheckInState({
    this.stage = FaceCaptureStage.idle,
    this.pose = FacePose.front,
    this.cameraController,
    this.errorMessage,
  });

  FaceCheckInState copyWith({
    FaceCaptureStage? stage,
    FacePose? pose,
    CameraController? cameraController,
    String? errorMessage,
  }) {
    return FaceCheckInState(
      stage: stage ?? this.stage,
      pose: pose ?? this.pose,
      cameraController: cameraController ?? this.cameraController,
      errorMessage: errorMessage,
    );
  }
}
