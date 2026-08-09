import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

class FaceCheckInScreen extends ConsumerStatefulWidget {
  const FaceCheckInScreen({super.key});

  @override
  ConsumerState<FaceCheckInScreen> createState() => _FaceCheckInScreenState();
}

class _FaceCheckInScreenState extends ConsumerState<FaceCheckInScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(faceCheckInControllerProvider);
    final attendanceState = ref.watch(attendanceControllerProvider);

    // The face capture pipeline (this screen) and the actual check-in
    // submission (AttendanceController) are two separate controllers —
    // once capture hands off a verified embedding, this screen just
    // reflects AttendanceController's own submission state instead of
    // inventing a parallel "submitting" state of its own.
    final isSubmitting = state.stage == FaceCaptureStage.done && attendanceState.isActionInProgress;

    return Scaffold(
      appBar: AppBar(title: const Text('Face Check-In')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _buildPreview(state)),
            const SizedBox(height: 16),
            Text(_statusText(state, isSubmitting), textAlign: TextAlign.center),
            if (state.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                state.errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 20),
            PrimaryButton(
              label: state.stage == FaceCaptureStage.idle ? 'Start' : 'Retry',
              isLoading: state.stage != FaceCaptureStage.idle && !isSubmitting,
              onPressed: (state.stage == FaceCaptureStage.idle || state.errorMessage != null) &&
                      !isSubmitting
                  ? () => ref.read(faceCheckInControllerProvider.notifier).start()
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreview(FaceCheckInState state) {
    final controller = state.cameraController;
    if (controller == null || !controller.value.isInitialized) {
      return const ColoredBox(
        color: Colors.black12,
        child: Center(child: Icon(Icons.camera_front_outlined, size: 64)),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: controller.value.aspectRatio,
        child: CameraPreview(controller),
      ),
    );
  }

  String _statusText(FaceCheckInState state, bool isSubmitting) {
    if (isSubmitting) return 'Checking in…';
    switch (state.stage) {
      case FaceCaptureStage.idle:
        return "Look at the camera and tap Start. You'll be asked to blink naturally.";
      case FaceCaptureStage.initializingCamera:
        return 'Starting camera…';
      case FaceCaptureStage.capturing:
        return 'Hold steady and blink naturally… (${state.frameIndex}/${state.totalFrames})';
      case FaceCaptureStage.verifying:
        return 'Verifying…';
      case FaceCaptureStage.done:
        return 'Face verified.';
    }
  }
}
