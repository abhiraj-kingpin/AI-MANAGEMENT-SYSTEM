import 'dart:math';

import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

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
