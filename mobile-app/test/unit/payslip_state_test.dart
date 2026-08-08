import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_state.dart';

void main() {
  group('PayslipState.copyWith', () {
    test('defaults to loading with no payslips', () {
      const state = PayslipState();

      expect(state.isLoading, isTrue);
      expect(state.payslips, isEmpty);
      expect(state.downloadingId, isNull);
    });

    test('clearDownloadingId explicitly clears the field rather than leaving it unset', () {
      const inProgress = PayslipState(isLoading: false, downloadingId: 'p1');

      final cleared = inProgress.copyWith(clearDownloadingId: true, lastDownloadedPath: '/tmp/x');

      expect(cleared.downloadingId, isNull);
      expect(cleared.lastDownloadedPath, '/tmp/x');
    });

    test('omitting downloadingId preserves the existing one', () {
      const inProgress = PayslipState(isLoading: false, downloadingId: 'p1');

      final updated = inProgress.copyWith(isLoading: true);

      expect(updated.downloadingId, 'p1');
    });
  });
}
