import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/face/domain/liveness/head_turn_liveness_checker.dart';

void main() {
  const checker = HeadTurnLivenessChecker();

  group('HeadTurnLivenessChecker.isFacingCenter', () {
    // Values here track centerThreshold (0.07, tightened from 0.12 for the
    // front-only capture flow — see the checker's own doc comment) rather
    // than duplicating the literal here, so this stays correct if that
    // threshold is ever deliberately retuned again.
    test('true within the center threshold either side of 0', () {
      expect(checker.isFacingCenter(0), isTrue);
      expect(checker.isFacingCenter(checker.centerThreshold - 0.01), isTrue);
      expect(checker.isFacingCenter(-(checker.centerThreshold - 0.01)), isTrue);
    });

    test('false once the proxy exceeds the center threshold', () {
      expect(checker.isFacingCenter(checker.centerThreshold + 0.01), isFalse);
      expect(checker.isFacingCenter(-0.3), isFalse);
    });
  });

  group('HeadTurnLivenessChecker.isTurnedAwayFromFront', () {
    test('true once the change from front exceeds the turn threshold', () {
      expect(checker.isTurnedAwayFromFront(0.3, 0), isTrue);
      expect(checker.isTurnedAwayFromFront(-0.3, 0), isTrue);
      expect(checker.isTurnedAwayFromFront(-0.1, 0.15), isTrue);
    });

    test('false for a turn too small to be a real head movement', () {
      expect(checker.isTurnedAwayFromFront(0.05, 0), isFalse);
      expect(checker.isTurnedAwayFromFront(0.03, -0.05), isFalse);
    });
  });

  group('HeadTurnLivenessChecker.isGenuineTurnSequence', () {
    test('true for a real front -> left -> right (or right -> left) swing', () {
      expect(
        checker.isGenuineTurnSequence(
          frontYawProxy: 0,
          turnOneYawProxy: -0.3,
          turnTwoYawProxy: 0.3,
        ),
        isTrue,
      );
      expect(
        checker.isGenuineTurnSequence(
          frontYawProxy: 0.02,
          turnOneYawProxy: 0.35,
          turnTwoYawProxy: -0.25,
        ),
        isTrue,
      );
    });

    test(
        'false when both turns land on the same side (no real opposite motion)',
        () {
      expect(
        checker.isGenuineTurnSequence(
          frontYawProxy: 0,
          turnOneYawProxy: 0.25,
          turnTwoYawProxy: 0.3,
        ),
        isFalse,
      );
    });

    test('false when a "turn" barely moved from front at all', () {
      expect(
        checker.isGenuineTurnSequence(
          frontYawProxy: 0,
          turnOneYawProxy: 0.05,
          turnTwoYawProxy: -0.35,
        ),
        isFalse,
      );
    });

    test('false for three near-identical readings (a held-up static photo)',
        () {
      expect(
        checker.isGenuineTurnSequence(
          frontYawProxy: 0.03,
          turnOneYawProxy: 0.05,
          turnTwoYawProxy: 0.02,
        ),
        isFalse,
      );
    });
  });
}
