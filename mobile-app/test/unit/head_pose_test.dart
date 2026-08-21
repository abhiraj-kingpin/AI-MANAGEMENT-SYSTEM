import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';
import 'package:ai_management_system/features/face/domain/liveness/head_pose.dart';

DetectedFace _faceWith({
  required Point2D? leftEye,
  required Point2D? rightEye,
  required Point2D? nose,
}) {
  return DetectedFace(
    boundingBoxLeft: 0,
    boundingBoxTop: 0,
    boundingBoxWidth: 200,
    boundingBoxHeight: 200,
    landmarks: {
      for (final name in FaceLandmarkName.values) name: null,
      FaceLandmarkName.leftEye: leftEye,
      FaceLandmarkName.rightEye: rightEye,
      FaceLandmarkName.noseBase: nose,
    },
    leftEyeOpenProbability: null,
    rightEyeOpenProbability: null,
    headEulerAngleY: null,
  );
}

void main() {
  group('estimateYawProxy', () {
    test(
        '≈0 when the nose sits on the midpoint between the eyes (facing forward)',
        () {
      final face = _faceWith(
        leftEye: const Point2D(120, 100),
        rightEye: const Point2D(80, 100),
        nose: const Point2D(100, 130),
      );
      expect(estimateYawProxy(face), closeTo(0, 1e-9));
    });

    test('positive when the nose shifts toward one eye', () {
      final face = _faceWith(
        leftEye: const Point2D(120, 100),
        rightEye: const Point2D(80, 100),
        nose: const Point2D(112, 130), // 12px toward the left eye, 40px apart
      );
      expect(estimateYawProxy(face), closeTo(0.3, 1e-9));
    });

    test('negative when the nose shifts toward the other eye', () {
      final face = _faceWith(
        leftEye: const Point2D(120, 100),
        rightEye: const Point2D(80, 100),
        nose: const Point2D(88, 130),
      );
      expect(estimateYawProxy(face), closeTo(-0.3, 1e-9));
    });

    test('null when any of the three required landmarks is missing', () {
      expect(
        estimateYawProxy(
          _faceWith(
              leftEye: null,
              rightEye: const Point2D(80, 100),
              nose: const Point2D(100, 130)),
        ),
        isNull,
      );
      expect(
        estimateYawProxy(
          _faceWith(
              leftEye: const Point2D(120, 100),
              rightEye: null,
              nose: const Point2D(100, 130)),
        ),
        isNull,
      );
      expect(
        estimateYawProxy(
          _faceWith(
              leftEye: const Point2D(120, 100),
              rightEye: const Point2D(80, 100),
              nose: null),
        ),
        isNull,
      );
    });

    test('null for a degenerate near-zero inter-eye distance', () {
      final face = _faceWith(
        leftEye: const Point2D(100, 100),
        rightEye: const Point2D(100.4, 100),
        nose: const Point2D(100, 130),
      );
      expect(estimateYawProxy(face), isNull);
    });
  });
}
