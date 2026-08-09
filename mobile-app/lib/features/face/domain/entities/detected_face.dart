import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// The 10 landmark positions ML Kit's `FaceDetector` can report (see
/// `google_mlkit_face_detection`'s `FaceLandmarkType`), referenced here by
/// name rather than importing that package's enum into the domain layer —
/// `core/services/face_detection_service.dart` is the one place that
/// translation happens. Order is fixed and matters: both
/// `BlinkLivenessChecker` and `GeometricEmbeddingGenerator` depend on every
/// landmark always occupying the same position in a face's data, so a
/// registration embedding and a later check-in embedding stay comparable.
enum FaceLandmarkName {
  leftEye,
  rightEye,
  leftEar,
  rightEar,
  leftCheek,
  rightCheek,
  noseBase,
  leftMouth,
  rightMouth,
  bottomMouth,
}

/// One face detected in one captured frame — this app's own representation
/// of ML Kit's `Face` result, translated by `FaceDetectionService`. Only
/// carries what `BlinkLivenessChecker` and `GeometricEmbeddingGenerator`
/// actually use, not ML Kit's full result (contours, tracking id, ...).
class DetectedFace {
  final double boundingBoxLeft;
  final double boundingBoxTop;
  final double boundingBoxWidth;
  final double boundingBoxHeight;

  /// Null for a landmark ML Kit didn't detect in this frame (e.g. an ear
  /// hidden by an extreme head turn) — callers fall back to the bounding
  /// box center, documented at the one place that happens
  /// (`GeometricEmbeddingGenerator`), rather than every caller re-deciding
  /// its own default.
  final Map<FaceLandmarkName, Point2D?> landmarks;

  /// 0.0–1.0, or null if ML Kit didn't compute it for this frame (only
  /// present when the detector was configured with
  /// `enableClassification: true`).
  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;

  const DetectedFace({
    required this.boundingBoxLeft,
    required this.boundingBoxTop,
    required this.boundingBoxWidth,
    required this.boundingBoxHeight,
    required this.landmarks,
    required this.leftEyeOpenProbability,
    required this.rightEyeOpenProbability,
  });
}
