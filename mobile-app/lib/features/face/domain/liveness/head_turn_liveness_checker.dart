/// The one real liveness check this app performs for check-in: a genuine
/// front → turned-one-way → turned-the-opposite-way head rotation across
/// three explicitly user-paced captures.
///
/// Fed a yaw *proxy* from `estimateYawProxy` (a landmark-geometry ratio,
/// not a literal angle) rather than ML Kit's own `headEulerAngleY` — see
/// that function's doc comment for why. The logic below only ever cares
/// about magnitude and relative sign, so it doesn't matter that the input
/// isn't in degrees.
///
/// Replaces an earlier blink-based check that asked for a natural blink
/// somewhere inside a blind, timed photo burst. That approach failed on
/// close to every real attempt: each "frame" was a full still-photo
/// capture (several hundred ms to well over a second, including
/// detection), so a handful of samples spread over a couple of seconds
/// were rolling the dice on ever landing a photo *during* a real blink's
/// ~100–400ms closed-eye instant — not a detection-accuracy problem, a
/// sampling-rate one. Head pose doesn't have that problem: the user
/// explicitly confirms each pose themselves once they're actually holding
/// it (tapping "Capture"), so there's no fast involuntary window to miss.
///
/// A held-up photo or video can't produce a genuine pass here: turning the
/// *camera* left and right doesn't change the pictured face's own angle
/// the way turning a real head does, and holding a flat photo at an angle
/// to fake a turn fails the front pose's centering check first (see
/// `isFacingCenter`) — an attacker would need the front shot to also be
/// off-center, which the first step already rejects.
class HeadTurnLivenessChecker {
  const HeadTurnLivenessChecker({
    this.centerThreshold = 0.12,
    this.turnThreshold = 0.2,
  });

  /// How far the yaw proxy may sit from 0 and still count as "facing the
  /// camera" — see `estimateYawProxy`'s doc comment for what this ratio
  /// means.
  final double centerThreshold;

  /// Minimum change in the yaw proxy from the front reading required to
  /// count as a genuine turn.
  final double turnThreshold;

  bool isFacingCenter(double yawProxy) => yawProxy.abs() <= centerThreshold;

  /// [yawProxy] is the pose being checked; [frontYawProxy] is the
  /// already-accepted front pose's reading. Checks magnitude of change
  /// only, deliberately not which raw sign corresponds to the device's
  /// physical left vs. right — that mapping isn't guaranteed consistent
  /// across devices or camera orientations, but "did the head actually
  /// turn" doesn't depend on knowing which way.
  bool isTurnedAwayFromFront(double yawProxy, double frontYawProxy) =>
      (yawProxy - frontYawProxy).abs() >= turnThreshold;

  /// The actual liveness verdict, checked once all three poses are in
  /// hand: a front reading plus two turns that both moved far enough away
  /// from it *and* moved in opposite directions from each other — not two
  /// photos of the same slightly-off-center pose.
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
