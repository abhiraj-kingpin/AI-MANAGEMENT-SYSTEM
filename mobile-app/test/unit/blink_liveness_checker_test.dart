import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/face/domain/liveness/blink_liveness_checker.dart';
import 'package:ai_management_system/features/face/domain/liveness/eye_state.dart';

const _open = EyeState(leftOpenProbability: 0.95, rightOpenProbability: 0.95);
const _closed = EyeState(leftOpenProbability: 0.05, rightOpenProbability: 0.05);
const _inconclusive = EyeState(leftOpenProbability: 0.5, rightOpenProbability: 0.5);
const _missing = EyeState();

void main() {
  const checker = BlinkLivenessChecker();

  group('BlinkLivenessChecker.isGenuineBlink', () {
    test('true for a genuine open -> closed -> open sequence', () {
      expect(checker.isGenuineBlink([_open, _closed, _open]), isTrue);
    });

    test('false for eyes that stay open the whole time (a held-up photo)', () {
      expect(checker.isGenuineBlink([_open, _open, _open, _open]), isFalse);
    });

    test('false for eyes that stay closed the whole time', () {
      expect(checker.isGenuineBlink([_closed, _closed, _closed]), isFalse);
    });

    test('false for a single frame, however it reads', () {
      expect(checker.isGenuineBlink([_open]), isFalse);
      expect(checker.isGenuineBlink([_closed]), isFalse);
    });

    test('false for an empty reading list', () {
      expect(checker.isGenuineBlink([]), isFalse);
    });

    test('skips inconclusive/missing frames rather than resetting progress', () {
      final readings = [_open, _inconclusive, _missing, _closed, _inconclusive, _open];
      expect(checker.isGenuineBlink(readings), isTrue);
    });

    test('only closed -> open (no leading open) is not a genuine blink', () {
      expect(checker.isGenuineBlink([_closed, _open]), isFalse);
    });
  });

  group('EyeState.isOpen', () {
    test('is null when either probability is missing', () {
      expect(_missing.isOpen, isNull);
      expect(const EyeState(leftOpenProbability: 0.9).isOpen, isNull);
    });

    test('is null in the ambiguous middle band, not false', () {
      expect(_inconclusive.isOpen, isNull);
    });
  });
}
