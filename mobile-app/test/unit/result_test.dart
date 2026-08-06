import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';

void main() {
  group('Result', () {
    test('Success routes to the success branch with its value', () {
      const result = Success<int>(42);

      final output = result.when(
        success: (value) => 'ok:$value',
        failure: (failure) => 'err:${failure.message}',
      );

      expect(output, 'ok:42');
      expect(result.isSuccess, isTrue);
    });

    test('ResultFailure routes to the failure branch with its Failure', () {
      const result = ResultFailure<int>(ServerFailure('boom', code: 'X'));

      final output = result.when(
        success: (value) => 'ok:$value',
        failure: (failure) => 'err:${failure.message}',
      );

      expect(output, 'err:boom');
      expect(result.isSuccess, isFalse);
    });
  });
}
