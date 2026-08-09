import 'dart:math';

import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// ⚠️ NOT a trained face-recognition model.
///
/// The backend's own `faceEmbedding.provider.ts` already carries an
/// equivalent, explicitly-labeled placeholder for the exact same reason
/// (server-side registration): no GPU, no way to bundle/verify a real
/// `.tflite` FaceNet/MobileFaceNet model in this environment. This is that
/// same tradeoff made again on the client — `tflite_flutter` was
/// deliberately not added this pass. A real project would replace this
/// function with on-device TFLite inference and change nothing else: every
/// caller (registration, check-in) only depends on "a fixed-length
/// `List<double>` such that the same person's vectors land close together
/// under cosine similarity", which this honestly does NOT reliably achieve
/// — it's a deterministic function of a *detected face's geometry* (unlike
/// the backend's byte-hash placeholder, which has zero relationship to the
/// image content at all), so it's somewhat more meaningful, but geometric
/// landmark positions shift with head angle, expression, and lighting-driven
/// detection jitter far more than a learned embedding would tolerate. It
/// exists so the rest of the pipeline (liveness gating, the
/// register/verify/check-in API contract, RBAC, quality filtering) is
/// fully real and exercisable end-to-end, exactly like the backend
/// placeholder's own doc comment describes.
///
/// Produces a fixed-length (67) vector so registration and check-in
/// embeddings are always comparable regardless of which frame produced
/// them:
/// - 10 landmark positions × (x, y), normalized to the face's own bounding
///   box (translation- and scale-invariant within a frame) = 20 numbers.
/// - All 45 pairwise distances between those same 10 normalized points —
///   distances between "corners" of a face survive normalization better
///   than raw positions do, since they're invariant to a systematic offset
///   in where the bounding box was drawn.
/// - The two eye-open-probabilities = 2 numbers (defaulted to 0.5 —
///   "unknown" — when ML Kit didn't compute them, so a missing value never
///   changes the vector's length).
/// - L2-normalized at the end, matching the backend placeholder's own
///   "unit vector" convention.
class GeometricEmbeddingGenerator {
  const GeometricEmbeddingGenerator();

  static const int dimensions = 67;

  List<double> generate(DetectedFace face) {
    final normalizedPoints = FaceLandmarkName.values
        .map((name) => _normalize(face.landmarks[name], face))
        .toList(growable: false);

    final values = <double>[];
    for (final point in normalizedPoints) {
      values.add(point.x);
      values.add(point.y);
    }
    for (var i = 0; i < normalizedPoints.length; i++) {
      for (var j = i + 1; j < normalizedPoints.length; j++) {
        values.add(_distance(normalizedPoints[i], normalizedPoints[j]));
      }
    }
    values.add(face.leftEyeOpenProbability ?? 0.5);
    values.add(face.rightEyeOpenProbability ?? 0.5);

    return _l2Normalize(values);
  }

  /// Maps a landmark into [0, 1] relative to the face's own bounding box —
  /// (0, 0) is the box's top-left, (1, 1) its bottom-right. A missing
  /// landmark (ML Kit didn't detect it in this frame) defaults to the
  /// box's center: a neutral fallback that keeps the vector's length fixed
  /// without fabricating a plausible-looking but fake position.
  Point2D _normalize(Point2D? point, DetectedFace face) {
    if (point == null) return const Point2D(0.5, 0.5);
    final x = (point.x - face.boundingBoxLeft) / face.boundingBoxWidth;
    final y = (point.y - face.boundingBoxTop) / face.boundingBoxHeight;
    return Point2D(x, y);
  }

  double _distance(Point2D a, Point2D b) {
    return sqrt(pow(a.x - b.x, 2) + pow(a.y - b.y, 2));
  }

  List<double> _l2Normalize(List<double> values) {
    final norm = sqrt(values.fold<double>(0, (sum, v) => sum + v * v));
    if (norm == 0) return values;
    return values.map((v) => v / norm).toList(growable: false);
  }
}
