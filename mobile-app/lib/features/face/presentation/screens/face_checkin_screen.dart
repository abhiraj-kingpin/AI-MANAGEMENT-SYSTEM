import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_checkin_state.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

final _timeFormat = DateFormat.jm();
final _dayDateFormat = DateFormat('EEEE, MMMM d');

class FaceCheckInScreen extends ConsumerStatefulWidget {
  const FaceCheckInScreen({super.key});

  @override
  ConsumerState<FaceCheckInScreen> createState() => _FaceCheckInScreenState();
}

class _FaceCheckInScreenState extends ConsumerState<FaceCheckInScreen> {
  // Brief white flash + haptic tap the instant a photo is captured — the
  // camera preview alone gave no confirmation a photo was actually taken.
  bool _flash = false;
  Timer? _flashTimer;

  void _triggerCaptureFlash() {
    HapticFeedback.mediumImpact();
    setState(() => _flash = true);
    _flashTimer?.cancel();
    _flashTimer = Timer(const Duration(milliseconds: 160), () {
      if (mounted) setState(() => _flash = false);
    });
  }

  @override
  void dispose() {
    _flashTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<FaceCheckInState>(faceCheckInControllerProvider,
        (previous, next) {
      final justCaptured = previous?.stage != FaceCaptureStage.processingCapture &&
          next.stage == FaceCaptureStage.processingCapture;
      if (justCaptured) _triggerCaptureFlash();
    });

    final state = ref.watch(faceCheckInControllerProvider);
    final attendanceState = ref.watch(attendanceControllerProvider);

    final isSubmitting = state.stage == FaceCaptureStage.done &&
        attendanceState.isActionInProgress;
    final submissionOutcome = state.stage == FaceCaptureStage.done &&
            !attendanceState.isActionInProgress
        ? _outcomeFor(attendanceState)
        : _Outcome.pending;

    return Scaffold(
      appBar: AppBar(title: const Text('Face Check-In')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (state.stage != FaceCaptureStage.idle &&
                submissionOutcome != _Outcome.success) ...[
              _StepIndicator(pose: state.pose),
              const SizedBox(height: 12),
            ],
            Expanded(
              child: submissionOutcome == _Outcome.success
                  ? _buildSuccess(context, attendanceState)
                  : _buildPreview(state),
            ),
            const SizedBox(height: 16),
            Text(
              _statusText(
                  state, isSubmitting, submissionOutcome, attendanceState),
              textAlign: TextAlign.center,
            ),
            if (state.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                state.errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (submissionOutcome == _Outcome.failure &&
                attendanceState.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                attendanceState.errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 20),
            if (submissionOutcome == _Outcome.success)
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              )
            else
              PrimaryButton(
                label: _buttonLabel(state, submissionOutcome),
                isLoading: state.stage == FaceCaptureStage.initializingCamera ||
                    state.stage == FaceCaptureStage.processingCapture ||
                    state.stage == FaceCaptureStage.verifying ||
                    isSubmitting,
                onPressed: _onPressed(state, submissionOutcome, isSubmitting),
              ),
          ],
        ),
      ),
    );
  }

  String _buttonLabel(FaceCheckInState state, _Outcome outcome) {
    if (outcome == _Outcome.failure) return 'Start Over';
    if (state.stage == FaceCaptureStage.idle) return 'Start';
    return 'Capture';
  }

  VoidCallback? _onPressed(
      FaceCheckInState state, _Outcome outcome, bool isSubmitting) {
    if (isSubmitting) return null;
    if (state.stage == FaceCaptureStage.idle || outcome == _Outcome.failure) {
      return () => ref.read(faceCheckInControllerProvider.notifier).start();
    }
    if (state.stage == FaceCaptureStage.awaitingCapture) {
      return () =>
          ref.read(faceCheckInControllerProvider.notifier).captureCurrentPose();
    }
    return null;
  }

  _Outcome _outcomeFor(AttendanceState attendanceState) {
    if (attendanceState.errorMessage != null) return _Outcome.failure;
    if (attendanceState.infoMessage != null) return _Outcome.queued;
    return _Outcome.success;
  }

  Widget _buildSuccess(BuildContext context, AttendanceState attendanceState) {
    final checkInAt = attendanceState.today?.checkInAt;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.check_circle,
            size: 96, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          checkInAt != null
              ? 'Checked in at ${_timeFormat.format(checkInAt.toLocal())}'
              : 'Checked in',
          style: Theme.of(context).textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        if (checkInAt != null) ...[
          const SizedBox(height: 4),
          Text(
            _dayDateFormat.format(checkInAt.toLocal()),
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ],
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
        child: Stack(
          fit: StackFit.expand,
          children: [
            CameraPreview(controller),
            IgnorePointer(
              child: AnimatedOpacity(
                opacity: _flash ? 0.85 : 0,
                duration: const Duration(milliseconds: 80),
                child: const ColoredBox(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _statusText(
    FaceCheckInState state,
    bool isSubmitting,
    _Outcome outcome,
    AttendanceState attendanceState,
  ) {
    if (isSubmitting) return 'Verified — checking in…';
    if (state.stage == FaceCaptureStage.done) {
      switch (outcome) {
        case _Outcome.success:
          return "You're checked in.";
        case _Outcome.queued:
          return attendanceState.infoMessage ??
              "Saved for sync once you're back online.";
        case _Outcome.failure:
          return "Verified, but the check-in itself didn't go through:";
        case _Outcome.pending:
          break;
      }
    }
    switch (state.stage) {
      case FaceCaptureStage.idle:
        return "You'll take three quick photos: one looking straight ahead, then one "
            'turned to each side — this proves a real face is here, not a photo held '
            'up to the camera.';
      case FaceCaptureStage.initializingCamera:
        return 'Starting camera…';
      case FaceCaptureStage.awaitingCapture:
        return switch (state.pose) {
          FacePose.front => 'Look straight at the camera, then tap Capture.',
          FacePose.left => 'Now turn your head to one side, then tap Capture.',
          FacePose.right =>
            'Now turn your head to the other side, then tap Capture.',
        };
      case FaceCaptureStage.processingCapture:
        return 'Checking that photo…';
      case FaceCaptureStage.verifying:
        return 'Verifying…';
      case FaceCaptureStage.done:
        return 'Verified.';
    }
  }
}

enum _Outcome { pending, success, queued, failure }

class _StepIndicator extends StatelessWidget {
  final FacePose pose;
  const _StepIndicator({required this.pose});

  @override
  Widget build(BuildContext context) {
    const poses = FacePose.values;
    final currentIndex = poses.indexOf(pose);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < poses.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: i <= currentIndex
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
          ),
        ],
      ],
    );
  }
}
