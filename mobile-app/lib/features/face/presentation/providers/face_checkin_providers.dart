import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/services/camera_service.dart';
import 'package:ai_management_system/core/services/face_detection_service.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_controller.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';

/// `.autoDispose` deliberately, unlike `attendanceControllerProvider` —
/// this one holds a live camera session, which should release the moment
/// the check-in screen is left, not linger for the app's lifetime the way
/// the singleton services in `core_providers.dart` do.
final faceCheckInControllerProvider =
    StateNotifierProvider.autoDispose<FaceCheckInController, FaceCheckInState>((ref) {
  final controller = FaceCheckInController(
    cameraService: CameraService(),
    faceDetectionService: FaceDetectionService(),
    onVerified: ({required embedding, required livenessPassed}) {
      ref.read(attendanceControllerProvider.notifier).checkInWithFace(
            embedding: embedding,
            livenessPassed: livenessPassed,
          );
    },
  );
  ref.onDispose(controller.dispose);
  return controller;
});
