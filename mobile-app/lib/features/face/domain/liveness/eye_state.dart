/// One frame's eye-openness reading, from `DetectedFace`'s classification
/// probabilities.
class EyeState {
  final double? leftOpenProbability;
  final double? rightOpenProbability;
  const EyeState({this.leftOpenProbability, this.rightOpenProbability});

  static const _openThreshold = 0.6;
  static const _closedThreshold = 0.4;

  /// `true` if both eyes are confidently open, `false` if both are
  /// confidently closed, `null` if inconclusive (missing data, or either
  /// eye sits in the ambiguous band between the two thresholds) — kept
  /// distinct from `false` deliberately: `BlinkLivenessChecker` skips
  /// inconclusive frames rather than treating them as "closed", so one
  /// blurry frame from a shaky hand doesn't derail an otherwise-genuine
  /// blink sequence.
  bool? get isOpen {
    final left = leftOpenProbability;
    final right = rightOpenProbability;
    if (left == null || right == null) return null;
    if (left >= _openThreshold && right >= _openThreshold) return true;
    if (left <= _closedThreshold && right <= _closedThreshold) return false;
    return null;
  }
}
