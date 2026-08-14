import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';

/// Scans a QR code and submits it as a `method: 'qr'` check-in.
/// `mobile_scanner` is touched only here — the same one-place-per-plugin
/// discipline `CameraService`/`FaceDetectionService` keep for Face
/// check-in. Unlike Face check-in, there's no multi-step capture pipeline
/// to justify its own controller/state: decoding a barcode is a single
/// event, so this screen owns the `MobileScannerController` directly and
/// forwards straight to `AttendanceController.checkInWithQr()` — the same
/// controller GPS and Face check-in already submit through.
class QrCheckInScreen extends ConsumerStatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  ConsumerState<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends ConsumerState<QrCheckInScreen> {
  final _controller = MobileScannerController();

  /// True once a code has been read and handed off — guards against
  /// `onDetect` firing again (it keeps scanning every frame) for the same
  /// code before the controller has actually stopped.
  bool _handled = false;

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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Check In with QR')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(controller: _controller, onDetect: _onDetect),
                if (_handled && attendanceState.isActionInProgress)
                  const ColoredBox(
                    color: Colors.black54,
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildStatus(context, attendanceState),
          ),
        ],
      ),
    );
  }

  Widget _buildStatus(BuildContext context, AttendanceState state) {
    if (!_handled) {
      return const Text(
        'Point the camera at a QR code to check in.',
        textAlign: TextAlign.center,
      );
    }
    if (state.isActionInProgress) {
      return const Text('Checking in…', textAlign: TextAlign.center);
    }
    if (state.errorMessage != null) {
      return Column(
        children: [
          Text(
            state.errorMessage!,
            textAlign: TextAlign.center,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _scanAgain, child: const Text('Scan Again')),
        ],
      );
    }
    // Success — including the offline-queued case, which surfaces via
    // infoMessage rather than errorMessage (see AttendanceController's
    // OfflineQueuedFailure handling).
    return Column(
      children: [
        Text(
          state.infoMessage ?? 'Checked in.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Theme.of(context).colorScheme.primary),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Done'),
        ),
      ],
    );
  }
}
