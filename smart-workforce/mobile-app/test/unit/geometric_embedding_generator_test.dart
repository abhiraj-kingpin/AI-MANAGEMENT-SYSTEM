import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/face/domain/embedding/geometric_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

DetectedFace _fakeFace({
  Map<FaceLandmarkName, Point2D?>? landmarkOverrides,
  double? leftEyeOpen,
  double? rightEyeOpen,
}) {
  final landmarks = <FaceLandmarkName, Point2D?>{
    for (final name in FaceLandmarkName.values) name: const Point2D(150, 150),
    ...?landmarkOverrides,
  };
  return DetectedFace(
    boundingBoxLeft: 100,
    boundingBoxTop: 100,
    boundingBoxWidth: 200,
    boundingBoxHeight: 200,
    landmarks: landmarks,
    leftEyeOpenProbability: leftEyeOpen,
    rightEyeOpenProbability: rightEyeOpen,
    headEulerAngleY: 0,
  );
}

double _cosineSimilarity(List<double> a, List<double> b) {
  var dot = 0.0, normA = 0.0, normB = 0.0;
  for (var i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (sqrt(normA) * sqrt(normB));
}

void main() {
  const generator = GeometricEmbeddingGenerator();

  group('GeometricEmbeddingGenerator.generate', () {
    test('always produces a fixed-length vector matching backend requirements',
        () {
      final vector = generator.generate(_fakeFace());

      expect(vector.length, GeometricEmbeddingGenerator.dimensions);
      expect(vector.length, greaterThanOrEqualTo(64));
      expect(vector.length, lessThanOrEqualTo(1024));
    });

    test(
        'is L2-normalized (unit vector), matching the backend placeholder convention',
        () {
      final vector = generator.generate(
        _fakeFace(landmarkOverrides: {
          FaceLandmarkName.noseBase: const Point2D(210, 260),
        },),
      );

      final normSquared = vector.fold<double>(0, (sum, v) => sum + v * v);
      expect(normSquared, closeTo(1.0, 1e-9));
    });

    test(
        'a missing landmark defaults to the bounding box center rather than throwing',
        () {
      final vector = generator.generate(
        _fakeFace(landmarkOverrides: {FaceLandmarkName.leftEar: null}),
      );

      expect(vector.length, GeometricEmbeddingGenerator.dimensions);
    });

    test(
        'the same detected geometry always produces the same vector (deterministic)',
        () {
      final face = _fakeFace(
        landmarkOverrides: {FaceLandmarkName.noseBase: const Point2D(200, 220)},
        leftEyeOpen: 0.9,
        rightEyeOpen: 0.92,
      );

      expect(generator.generate(face), generator.generate(face));
    });

    test('two visibly different face geometries are not near-identical vectors',
        () {
      final faceA = _fakeFace(
        landmarkOverrides: {FaceLandmarkName.noseBase: const Point2D(150, 150)},
      );
      final faceB = _fakeFace(
        landmarkOverrides: {FaceLandmarkName.noseBase: const Point2D(280, 290)},
      );

      final similarity = _cosineSimilarity(
          generator.generate(faceA), generator.generate(faceB),);
      expect(similarity, lessThan(0.999));
    });
  });
}
