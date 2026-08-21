import 'package:camera/camera.dart';

/// Which of the three explicitly-confirmed head positions this attempt is
/// currently on — see `FaceCheckInController`'s doc comment for why this
/// replaced a single blind capture burst.
enum FacePose { front, left, right }

enum FaceCaptureStage {
  idle,
  initializingCamera,
  // Camera's up, waiting for the user to hold the current pose and tap
  // Capture — there is no auto-capture timer; the user decides when
  // they're ready, which is the whole point of this design.
  awaitingCapture,
  // A capture was just taken and is being detected/validated/embedded.
  processingCapture,
  verifying,
  done,
}

class FaceCheckInState {
  final FaceCaptureStage stage;
  final FacePose pose;

  /// Held here (not just inside `CameraService`) because `CameraPreview`
  /// needs a live `CameraController` to render against — the one place
  /// this presentation layer touches a `camera` package type directly,
  /// same exception `AttendanceScreen` doesn't need since it has no
  /// preview surface to bind to.
  final CameraController? cameraController;

  /// Per-attempt feedback ("Please look straight at the camera", "Turn a
  /// little further") — cleared on the next capture attempt for the same
  /// pose, not carried across poses.
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
