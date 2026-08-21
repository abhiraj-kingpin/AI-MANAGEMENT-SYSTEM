import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';

/// A geometry-only proxy for how far a face has turned left/right,
/// computed from ML Kit's own 2D landmark positions rather than its
/// built-in `Face.headEulerAngleY`.
///
/// That value is only reliably populated in the detector's `.accurate`
/// performance mode — ML Kit's own doc comment says so explicitly — and
/// switching this app's `FaceDetectionService` to `.accurate` mode to get
/// it measurably hurt plain face detection on real hardware: faces
/// `.fast` mode found without trouble sometimes came back completely
/// undetected under `.accurate` ("No face detected" even with a face
/// clearly in frame). That's a worse trade than computing a turn proxy
/// ourselves from landmarks, which `.fast` mode reports just as well
/// (`enableLandmarks` is independent of `performanceMode`).
///
/// The proxy: how far the nose sits from the midpoint between the two
/// eyes, as a fraction of the distance between the eyes. Facing the
/// camera, the nose sits almost exactly on that midpoint (≈0); turning
/// the head to either side moves the nose noticeably toward one eye
/// relative to the other. The sign indicates a direction, but nothing
/// that reads this value ever interprets *which* physical side it
/// corresponds to — only magnitude, and (for a real turn-then-turn-back)
/// opposite sign, ever matter (see `HeadTurnLivenessChecker`, which was
/// already written direction-agnostic for exactly this reason).
double? estimateYawProxy(DetectedFace face) {
  final leftEye = face.landmarks[FaceLandmarkName.leftEye];
  final rightEye = face.landmarks[FaceLandmarkName.rightEye];
  final nose = face.landmarks[FaceLandmarkName.noseBase];
  if (leftEye == null || rightEye == null || nose == null) return null;

  final eyeMidX = (leftEye.x + rightEye.x) / 2;
  final interEyeDistance = (rightEye.x - leftEye.x).abs();
  if (interEyeDistance < 1) return null; // degenerate/too-small a face crop

  return (nose.x - eyeMidX) / interEyeDistance;
}
