import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';
import 'package:ai_management_system/shared/widgets/wp_scan_overlay.dart';

final _dayDateTimeFormat = DateFormat('EEEE, MMMM d \'at\' h:mm a');

class QrCheckInScreen extends ConsumerStatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  ConsumerState<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends ConsumerState<QrCheckInScreen> with SingleTickerProviderStateMixin {
  final _controller = MobileScannerController();
  late final AnimationController _scanController;

  bool _handled = false;

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat(reverse: true);
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final token = barcodes.first.rawValue;
    if (token == null || token.isEmpty) return;

    setState(() => _handled = true);
    _controller.stop();
    ref.read(attendanceControllerProvider.notifier).checkInWithQr(token);
  }

  void _scanAgain() {
    setState(() => _handled = false);
    _controller.start();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scanController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceControllerProvider);
    final isDone = _handled && !attendanceState.isActionInProgress;

    return Scaffold(
      backgroundColor: WPColors.dark,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            // Without this, a camera failure (most commonly denied
            // permission) fell through to mobile_scanner's own bare default
            // state instead of anything matching this screen's design —
            // effectively the same "blank screen with no explanation"
            // problem Face check-in already guards against via
            // CameraService/CameraPermissionDeniedException.
            errorBuilder: (context, error, child) => Container(
              color: WPColors.dark,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.camera_front_outlined, size: 64, color: Colors.white24),
                  const SizedBox(height: 16),
                  Text(
                    error.errorCode == MobileScannerErrorCode.permissionDenied
                        ? "Camera access is turned off for this app. Enable it in your phone's Settings to scan a QR code."
                        : "Couldn't start the camera. Please try again.",
                    textAlign: TextAlign.center,
                    style: WPText.sans(size: 13.5, weight: FontWeight.w600, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          if (!isDone) WPScanOverlay(animation: _scanController, width: 240, height: 240),
          if (_handled && attendanceState.isActionInProgress)
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: const CircularProgressIndicator(color: Colors.white),
            ),
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
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.16), shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                    ),
                  ),
                  const Spacer(),
                  Text('Check In with QR', style: WPText.sans(size: 15, weight: FontWeight.w700, color: Colors.white)),
                  const Spacer(),
                  const SizedBox(width: 40),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(20, 22, 20, MediaQuery.of(context).padding.bottom + 22),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: _buildStatus(context, attendanceState),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatus(BuildContext context, AttendanceState state) {
    if (!_handled) {
      return Text(
        'Point the camera at the office QR code to check in.',
        textAlign: TextAlign.center,
        style: WPText.sans(size: 13.5, weight: FontWeight.w600, height: 1.4),
      );
    }
    if (state.isActionInProgress) {
      return Text('Checking in…', textAlign: TextAlign.center, style: WPText.sans(size: 13.5, weight: FontWeight.w600));
    }
    if (state.errorMessage != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(state.errorMessage!, textAlign: TextAlign.center, style: WPText.sans(size: 13, color: WPColors.danger)),
          const SizedBox(height: 14),
          WPButton(label: 'Scan Again', variant: WPButtonVariant.dark, onPressed: _scanAgain),
        ],
      );
    }
    final checkInAt = state.today?.checkInAt;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle, color: WPColors.success, size: 20),
            const SizedBox(width: 8),
            Text(state.infoMessage ?? 'Checked in.',
                style: WPText.sans(size: 14, weight: FontWeight.w700, color: WPColors.successText),),
          ],
        ),
        if (checkInAt != null) ...[
          const SizedBox(height: 4),
          Text(_dayDateTimeFormat.format(checkInAt.toLocal()),
              textAlign: TextAlign.center, style: WPText.sans(size: 12, weight: FontWeight.w500, color: WPColors.textDim),),
        ],
        const SizedBox(height: 16),
        WPButton(label: 'Done', variant: WPButtonVariant.dark, onPressed: () => Navigator.of(context).pop()),
      ],
    );
  }
}
