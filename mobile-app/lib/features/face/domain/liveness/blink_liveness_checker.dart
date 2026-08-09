import 'package:ai_management_system/features/face/domain/liveness/eye_state.dart';

enum _Phase { seekingOpen, seekingClosed, seekingOpenAgain }

/// The one real liveness check this app performs: a genuine open → closed
/// → open eye sequence across a handful of consecutive captured frames.
/// Pure decision logic, deliberately separated from anything that touches
/// a camera or ML Kit, so it's unit-testable with fixed frame sequences
/// rather than only verifiable on a real device.
///
/// A static photo (printed or on a screen) held up to the camera reads as
/// permanently open (or permanently occluded/closed) — it can never
/// produce a real transition through all three phases, which is the whole
/// point of asking for a blink rather than just "detect any face".
class BlinkLivenessChecker {
  const BlinkLivenessChecker();

  /// `readings` should be in capture order. Inconclusive frames
  /// (`EyeState.isOpen == null`) are skipped rather than resetting
  /// progress — a single blurry frame from a shaky hand shouldn't fail an
  /// otherwise-genuine blink.
  bool isGenuineBlink(List<EyeState> readings) {
    var phase = _Phase.seekingOpen;
    for (final reading in readings) {
      final isOpen = reading.isOpen;
      if (isOpen == null) continue;

      switch (phase) {
        case _Phase.seekingOpen:
          if (isOpen) phase = _Phase.seekingClosed;
        case _Phase.seekingClosed:
          if (!isOpen) phase = _Phase.seekingOpenAgain;
        case _Phase.seekingOpenAgain:
          if (isOpen) return true;
      }
    }
    return false;
  }
}
