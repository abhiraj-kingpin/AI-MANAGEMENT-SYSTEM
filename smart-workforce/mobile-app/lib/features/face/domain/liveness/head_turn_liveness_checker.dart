class HeadTurnLivenessChecker {
  // Face check-in is front-only now (no head-turn sequence — see
  // FaceCheckInController), so this single frame is the only alignment
  // check before it becomes the match embedding. Tightened from 0.12 so
  // "look straight at the camera" actually means centered, not just
  // roughly forward — turnThreshold and the turn-sequence methods below
  // are unused by that flow now but kept in case liveness comes back.
  const HeadTurnLivenessChecker({
    this.centerThreshold = 0.07,
    this.turnThreshold = 0.2,
  });

  final double centerThreshold;

  final double turnThreshold;

  bool isFacingCenter(double yawProxy) => yawProxy.abs() <= centerThreshold;

  bool isTurnedAwayFromFront(double yawProxy, double frontYawProxy) =>
      (yawProxy - frontYawProxy).abs() >= turnThreshold;

  bool isGenuineTurnSequence({
    required double frontYawProxy,
    required double turnOneYawProxy,
    required double turnTwoYawProxy,
  }) {
    final oneDelta = turnOneYawProxy - frontYawProxy;
    final twoDelta = turnTwoYawProxy - frontYawProxy;
    final bothTurnedEnough =
        oneDelta.abs() >= turnThreshold && twoDelta.abs() >= turnThreshold;
    final oppositeDirections = oneDelta.sign != twoDelta.sign;
    return bothTurnedEnough && oppositeDirections;
  }
}
