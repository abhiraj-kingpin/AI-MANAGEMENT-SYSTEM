import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_state.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

class FaceRegistrationScreen extends ConsumerWidget {
  const FaceRegistrationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(faceRegistrationControllerProvider);
    final isBusy = state.stage != FaceRegistrationStage.idle &&
        state.stage != FaceRegistrationStage.done;

    return Scaffold(
      appBar: AppBar(title: const Text('Face Registration')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildStatusBanner(context, state),
            const SizedBox(height: 16),
            // On success, the camera preview is replaced by a clear
            // checkmark rather than left showing a now-frozen last frame —
            // a static camera image with small text below it (the previous
            // behavior) reads as "nothing happened" even though the save
            // already succeeded, which is exactly what led to registering
            // twice in a row (confirmed via the backend's own request log:
            // two separate successful `POST /face/register-embeddings`
            // calls 15 seconds apart for the same employee).
            Expanded(
              child: state.stage == FaceRegistrationStage.done
                  ? _buildSuccess(context, state)
                  : _buildPreview(state),
            ),
            const SizedBox(height: 16),
            Text(_statusText(state), textAlign: TextAlign.center),
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
              label:
                  state.status?.isRegistered == true ? 'Re-register' : 'Start',
              isLoading: isBusy,
              onPressed: isBusy
                  ? null
                  : () => ref
                      .read(faceRegistrationControllerProvider.notifier)
                      .startCapture(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBanner(BuildContext context, FaceRegistrationState state) {
    if (state.isLoadingStatus) {
      return const LinearProgressIndicator(minHeight: 2);
    }
    final status = state.status;
    if (status == null || !status.isRegistered) {
      return const Text(
        "You haven't registered your face for check-in yet.",
        textAlign: TextAlign.center,
      );
    }
    final lastRegistered = status.lastRegisteredAt;
    final when = lastRegistered != null
        ? '${lastRegistered.toLocal()}'.split('.').first
        : 'an earlier session';
    return Text(
      'Registered (${status.embeddingCount} reference photo(s)) — last updated $when.',
      textAlign: TextAlign.center,
    );
  }

  Widget _buildSuccess(BuildContext context, FaceRegistrationState state) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.check_circle,
            size: 96, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          state.successMessage ?? 'Face registered.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }

  Widget _buildPreview(FaceRegistrationState state) {
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

  String _statusText(FaceRegistrationState state) {
    switch (state.stage) {
      case FaceRegistrationStage.idle:
        return 'Look at the camera and tap Start. We\'ll take a few reference photos — '
            'move your head slightly between shots.';
      case FaceRegistrationStage.initializingCamera:
        return 'Starting camera…';
      case FaceRegistrationStage.capturing:
        return 'Hold steady… (${state.capturedCount}/${state.requiredFrames} captured)';
      case FaceRegistrationStage.submitting:
        return 'Saving your face data…';
      case FaceRegistrationStage.done:
        return 'You can retake this anytime with "Re-register" above.';
    }
  }
}
