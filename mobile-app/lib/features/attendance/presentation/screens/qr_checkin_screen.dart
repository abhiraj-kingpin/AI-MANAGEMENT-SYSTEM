import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';

final _dayDateTimeFormat = DateFormat('EEEE, MMMM d \'at\' h:mm a');

class QrCheckInScreen extends ConsumerStatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  ConsumerState<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends ConsumerState<QrCheckInScreen> {
  final _controller = MobileScannerController();

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
    final checkInAt = state.today?.checkInAt;
    return Column(
      children: [
        Text(
          state.infoMessage ?? 'Checked in.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Theme.of(context).colorScheme.primary),
        ),
        if (checkInAt != null) ...[
          const SizedBox(height: 4),
          Text(
            _dayDateTimeFormat.format(checkInAt.toLocal()),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Done'),
        ),
      ],
    );
  }
}
