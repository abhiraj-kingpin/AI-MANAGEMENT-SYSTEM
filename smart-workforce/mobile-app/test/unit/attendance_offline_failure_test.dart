import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/core/error/failures.dart';

void main() {
  group('OfflineQueuedFailure', () {
    test('is a Failure but distinguishable from a real error by type', () {
      const failure = OfflineQueuedFailure('No connection — check-in queued.');

      expect(failure, isA<Failure>());
      expect(failure.message, 'No connection — check-in queued.');
      expect(failure, isNot(isA<ServerFailure>()));
      expect(failure, isNot(isA<NetworkFailure>()));
    });
  });
}
