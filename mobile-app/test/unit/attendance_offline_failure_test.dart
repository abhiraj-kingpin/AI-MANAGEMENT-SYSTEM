import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/core/error/failures.dart';

void main() {
  group('OfflineQueuedFailure', () {
    test('is a Failure but distinguishable from a real error by type', () {
      const failure = OfflineQueuedFailure('No connection — check-in queued.');

      expect(failure, isA<Failure>());
      expect(failure.message, 'No connection — check-in queued.');
      // The whole point of a distinct subtype: callers can tell this apart
      // from ServerFailure/NetworkFailure without parsing the message.
      expect(failure, isNot(isA<ServerFailure>()));
      expect(failure, isNot(isA<NetworkFailure>()));
    });
  });
}
