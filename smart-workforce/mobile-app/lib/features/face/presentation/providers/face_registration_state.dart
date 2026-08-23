import 'package:camera/camera.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';

enum FaceRegistrationStage { idle, initializingCamera, capturing, submitting, done }

class FaceRegistrationState {
  final FaceRegistrationStage stage;

  final CameraController? cameraController;

  final int capturedCount;
  final int requiredFrames;

  final FaceRegistrationStatusEntity? status;
  final bool isLoadingStatus;

  final String? errorMessage;
  final String? successMessage;

  const FaceRegistrationState({
    this.stage = FaceRegistrationStage.idle,
    this.cameraController,
    this.capturedCount = 0,
    this.requiredFrames = 0,
    this.status,
    this.isLoadingStatus = false,
    this.errorMessage,
    this.successMessage,
  });

  FaceRegistrationState copyWith({
    FaceRegistrationStage? stage,
    CameraController? cameraController,
    int? capturedCount,
    int? requiredFrames,
    FaceRegistrationStatusEntity? status,
    bool? isLoadingStatus,
    String? errorMessage,
    String? successMessage,
  }) {
    return FaceRegistrationState(
      stage: stage ?? this.stage,
      cameraController: cameraController ?? this.cameraController,
      capturedCount: capturedCount ?? this.capturedCount,
      requiredFrames: requiredFrames ?? this.requiredFrames,
      status: status ?? this.status,
      isLoadingStatus: isLoadingStatus ?? this.isLoadingStatus,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}
