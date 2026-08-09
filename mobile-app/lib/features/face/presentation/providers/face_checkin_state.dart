import 'package:camera/camera.dart';

enum FaceCaptureStage { idle, initializingCamera, capturing, verifying, done }

class FaceCheckInState {
  final FaceCaptureStage stage;

  /// Held here (not just inside `CameraService`) because `CameraPreview`
  /// needs a live `CameraController` to render against — the one place
  /// this presentation layer touches a `camera` package type directly,
  /// same exception `AttendanceScreen` doesn't need since it has no
  /// preview surface to bind to.
  final CameraController? cameraController;

  final int frameIndex;
  final int totalFrames;
  final String? errorMessage;

  const FaceCheckInState({
    this.stage = FaceCaptureStage.idle,
    this.cameraController,
    this.frameIndex = 0,
    this.totalFrames = 0,
    this.errorMessage,
  });

  FaceCheckInState copyWith({
    FaceCaptureStage? stage,
    CameraController? cameraController,
    int? frameIndex,
    int? totalFrames,
    String? errorMessage,
  }) {
    return FaceCheckInState(
      stage: stage ?? this.stage,
      cameraController: cameraController ?? this.cameraController,
      frameIndex: frameIndex ?? this.frameIndex,
      totalFrames: totalFrames ?? this.totalFrames,
      errorMessage: errorMessage,
    );
  }
}
