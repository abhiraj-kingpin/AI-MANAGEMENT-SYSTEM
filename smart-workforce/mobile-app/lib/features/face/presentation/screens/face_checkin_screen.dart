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
import 'package:ai_management_system/shared/theme/wp_theme.dart';
import 'package:ai_management_system/shared/widgets/wp_scan_overlay.dart';

final _timeFormat = DateFormat.jm();
final _dayDateFormat = DateFormat('EEEE, MMMM d');

class FaceCheckInScreen extends ConsumerStatefulWidget {
  const FaceCheckInScreen({super.key});

  @override
  ConsumerState<FaceCheckInScreen> createState() => _FaceCheckInScreenState();
}

class _FaceCheckInScreenState extends ConsumerState<FaceCheckInScreen>
    with SingleTickerProviderStateMixin {
  // Brief white flash + haptic tap the instant a photo is captured — the
  // camera preview alone gave no confirmation a photo was actually taken.
  bool _flash = false;
  Timer? _flashTimer;
  late final AnimationController _scanController;

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat(reverse: true);
  }

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
    _scanController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<FaceCheckInState>(faceCheckInControllerProvider, (previous, next) {
      final justCaptured = previous?.stage != FaceCaptureStage.processingCapture &&
          next.stage == FaceCaptureStage.processingCapture;
      if (justCaptured) _triggerCaptureFlash();
    });

    final state = ref.watch(faceCheckInControllerProvider);
    final attendanceState = ref.watch(attendanceControllerProvider);

    final isSubmitting = state.stage == FaceCaptureStage.done && attendanceState.isActionInProgress;
    final submissionOutcome = state.stage == FaceCaptureStage.done && !attendanceState.isActionInProgress
        ? _outcomeFor(attendanceState)
        : _Outcome.pending;
    final showBrackets = state.stage != FaceCaptureStage.idle &&
        state.stage != FaceCaptureStage.done;

    // Previously the camera preview filled the entire screen behind the
    // opaque bottom control panel and was scaled to "cover" using the FULL
    // screen size — so it was covering (and cropping/zooming into) an area
    // that included real estate the user could never actually see. The
    // effective visible viewfinder was only the region above the panel, but
    // the crop math didn't know that, which left noticeably less headroom
    // to comfortably frame a whole face than the screen size suggested.
    // Confining the camera (and its scan-overlay guide, which must match
    // the same region or the guide brackets drift out of alignment with
    // what's actually visible) to an Expanded slot above the panel means
    // the cover-fit calculation is based on the real visible area, and nothing
    // is cropped away to fill space that was never visible in the first place.
    return Scaffold(
      backgroundColor: WPColors.dark,
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                submissionOutcome == _Outcome.success
                    ? Container(color: WPColors.dark)
                    : _buildCamera(context, state),
                if (showBrackets) WPScanOverlay(animation: _scanController),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, left: 14, right: 14, bottom: 40),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black.withOpacity(0.55), Colors.black.withOpacity(0.0)],
                      ),
                    ),
                    child: Row(
                      children: [
                        _RoundIconButton(icon: Icons.arrow_back, onTap: () => Navigator.of(context).pop()),
                        const Spacer(),
                        Text('Face Check-In', style: WPText.sans(size: 15, weight: FontWeight.w700, color: Colors.white)),
                        const Spacer(),
                        const SizedBox(width: 40),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          submissionOutcome == _Outcome.success
              ? _buildSuccess(context, attendanceState)
              : _buildControlPanel(context, state, isSubmitting, submissionOutcome, attendanceState),
        ],
      ),
    );
  }

  Widget _buildControlPanel(
    BuildContext context,
    FaceCheckInState state,
    bool isSubmitting,
    _Outcome submissionOutcome,
    AttendanceState attendanceState,
  ) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 22, 20, MediaQuery.of(context).padding.bottom + 22),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _statusText(state, isSubmitting, submissionOutcome, attendanceState),
            textAlign: TextAlign.center,
            style: WPText.sans(size: 13.5, weight: FontWeight.w600, height: 1.4),
          ),
          if (state.errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(state.errorMessage!, textAlign: TextAlign.center, style: WPText.sans(size: 12, color: WPColors.danger)),
          ],
          if (submissionOutcome == _Outcome.failure && attendanceState.errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(attendanceState.errorMessage!,
                textAlign: TextAlign.center, style: WPText.sans(size: 12, color: WPColors.danger),),
          ],
          const SizedBox(height: 18),
          WPButton(
            label: _buttonLabel(state, submissionOutcome),
            isLoading: state.stage == FaceCaptureStage.initializingCamera ||
                state.stage == FaceCaptureStage.processingCapture ||
                state.stage == FaceCaptureStage.verifying ||
                isSubmitting,
            onPressed: _onPressed(state, submissionOutcome, isSubmitting),
          ),
        ],
      ),
    );
  }

  String _buttonLabel(FaceCheckInState state, _Outcome outcome) {
    if (outcome == _Outcome.failure) return 'Start Over';
    if (state.stage == FaceCaptureStage.idle) return 'Start';
    return 'Capture';
  }

  VoidCallback? _onPressed(FaceCheckInState state, _Outcome outcome, bool isSubmitting) {
    if (isSubmitting) return null;
    if (state.stage == FaceCaptureStage.idle || outcome == _Outcome.failure) {
      return () => ref.read(faceCheckInControllerProvider.notifier).start();
    }
    if (state.stage == FaceCaptureStage.awaitingCapture) {
      return () => ref.read(faceCheckInControllerProvider.notifier).captureCurrentPose();
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
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(24, 40, 24, MediaQuery.of(context).padding.bottom + 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: const BoxDecoration(color: WPColors.success, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: const Icon(Icons.check, size: 44, color: Colors.white),
          ),
          const SizedBox(height: 20),
          Text(
            checkInAt != null ? 'Checked in at ${_timeFormat.format(checkInAt.toLocal())}' : 'Checked in',
            style: WPText.sans(size: 19, weight: FontWeight.w800, color: Colors.white),
            textAlign: TextAlign.center,
          ),
          if (checkInAt != null) ...[
            const SizedBox(height: 4),
            Text(_dayDateFormat.format(checkInAt.toLocal()),
                style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: Colors.white.withOpacity(0.6)),
                textAlign: TextAlign.center,),
          ],
          const SizedBox(height: 26),
          WPButton(label: 'Done', variant: WPButtonVariant.dark, onPressed: () => Navigator.of(context).pop()),
        ],
      ),
    );
  }

  Widget _buildCamera(BuildContext context, FaceCheckInState state) {
    final controller = state.cameraController;
    if (controller == null || !controller.value.isInitialized) {
      return Container(
        color: WPColors.dark,
        alignment: Alignment.center,
        child: const Icon(Icons.camera_front_outlined, size: 64, color: Colors.white24),
      );
    }
    // LayoutBuilder, not MediaQuery.of(context).size: this widget now only
    // occupies the Expanded region above the opaque control panel (see
    // build()), and the cover-fit scale must be computed against that
    // actual available area, not the full screen — using the full screen
    // here again would reintroduce the exact over-crop this was fixed for.
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        var scale = size.aspectRatio * controller.value.aspectRatio;
        if (scale < 1) scale = 1 / scale;
        return ClipRect(
          child: Transform.scale(
            scale: scale,
            child: Center(
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
          ),
        );
      },
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
          return attendanceState.infoMessage ?? "Saved for sync once you're back online.";
        case _Outcome.failure:
          return "Verified, but the check-in itself didn't go through:";
        case _Outcome.pending:
          break;
      }
    }
    switch (state.stage) {
      case FaceCaptureStage.idle:
        return 'Center your face in the frame and look straight at the camera — hold '
            'still so it reads clearly.';
      case FaceCaptureStage.initializingCamera:
        return 'Starting camera…';
      case FaceCaptureStage.awaitingCapture:
        return 'Look straight at the camera, centered in the frame, then tap Capture.';
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

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.16), shape: BoxShape.circle),
        alignment: Alignment.center,
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }
}
