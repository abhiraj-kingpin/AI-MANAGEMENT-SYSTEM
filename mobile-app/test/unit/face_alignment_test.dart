import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:ai_management_system/features/face/domain/embedding/face_alignment.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// Ported from the backend's already-passing `faceAlign.test.ts` (same
/// known-answer cases: identity, a known 2x scale, a known 90-degree
/// rotation, a known translation, plus the rejection cases and the two
/// `warpAlignedFace` round-trip tests) — written with no Dart/Flutter SDK
/// available to run it against, then confirmed passing (50/50, this suite
/// included) by `ci-mobile.yml`'s real Flutter toolchain.
void main() {
  Point2D meanPoint(List<Point2D> points) {
    var x = 0.0, y = 0.0;
    for (final p in points) {
      x += p.x;
      y += p.y;
    }
    return Point2D(x / points.length, y / points.length);
  }

  group('estimateSimilarityTransform', () {
    test('is near-identity when src equals dst exactly', () {
      final transform = estimateSimilarityTransform(referenceKeypoints112, referenceKeypoints112);

      final scale = _scaleOf(transform);
      final rotation = _rotationOf(transform);
      expect(scale, closeTo(1, 1e-6));
      expect(rotation, closeTo(0, 1e-6));
      expect(transform.b.re, closeTo(0, 1e-6));
      expect(transform.b.im, closeTo(0, 1e-6));
    });

    test('recovers a pure 2x scale (src scaled down from dst, from the origin)', () {
      const dst = referenceKeypoints112;
      final src = dst.map((p) => Point2D(p.x * 0.5, p.y * 0.5)).toList();

      final transform = estimateSimilarityTransform(src, dst);

      expect(_scaleOf(transform), closeTo(2, 1e-6));
      expect(_rotationOf(transform), closeTo(0, 1e-6));
    });

    test('recovers the inverse of a known rotation applied around the centroid', () {
      const dst = referenceKeypoints112;
      final center = meanPoint(dst);
      const appliedAngle = math.pi / 2;

      final src = dst.map((p) {
        final cx = p.x - center.x;
        final cy = p.y - center.y;
        return Point2D(
          center.x + (cx * math.cos(appliedAngle) - cy * math.sin(appliedAngle)),
          center.y + (cx * math.sin(appliedAngle) + cy * math.cos(appliedAngle)),
        );
      }).toList();

      final transform = estimateSimilarityTransform(src, dst);

      expect(_rotationOf(transform), closeTo(-appliedAngle, 1e-5));
      expect(_scaleOf(transform), closeTo(1, 1e-5));
    });

    test('recovers a pure translation', () {
      const dst = referenceKeypoints112;
      final src = dst.map((p) => Point2D(p.x + 10, p.y - 20)).toList();

      final transform = estimateSimilarityTransform(src, dst);

      expect(_scaleOf(transform), closeTo(1, 1e-5));
      expect(_rotationOf(transform), closeTo(0, 1e-5));
      expect(transform.b.re, closeTo(-10, 1e-4));
      expect(transform.b.im, closeTo(20, 1e-4));
    });

    test('rejects mismatched-length point lists', () {
      expect(
        () => estimateSimilarityTransform([const Point2D(0, 0)], referenceKeypoints112),
        throwsA(isA<AlignmentError>()),
      );
    });

    test('rejects fewer than 2 point correspondences', () {
      expect(
        () => estimateSimilarityTransform([const Point2D(0, 0)], [const Point2D(1, 1)]),
        throwsA(isA<AlignmentError>()),
      );
    });

    test('rejects degenerate (all-identical) source points', () {
      final samePoint = List.generate(3, (_) => const Point2D(5, 5));
      expect(
        () => estimateSimilarityTransform(samePoint, referenceKeypoints112.sublist(0, 3)),
        throwsA(isA<AlignmentError>()),
      );
    });
  });

  group('warpAlignedFace', () {
    test('round-trips a 112x112 source whose landmarks already sit exactly at the reference positions', () {
      const size = 112;
      final source = img.Image(width: size, height: size);
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          source.setPixelRgb(x, y, x % 256, y % 256, (x + y) % 256);
        }
      }

      final output = warpAlignedFace(source, referenceKeypoints112, size: size);

      for (final point in [
        [30, 30],
        [56, 56],
        [80, 40],
        [20, 90],
      ]) {
        final x = point[0], y = point[1];
        final idx = (y * size + x) * 3;
        final expectedPixel = source.getPixel(x, y);
        expect((output[idx] - expectedPixel.r).abs(), lessThanOrEqualTo(3));
      }
    });

    test('reproduces a solid color everywhere, regardless of the transform', () {
      const size = 40;
      final source = img.Image(width: size, height: size);
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          source.setPixelRgb(x, y, 200, 100, 50);
        }
      }

      final landmarks = referenceKeypoints112.map((p) => Point2D(p.x * 0.3 + 5, p.y * 0.3 + 5)).toList();

      final output = warpAlignedFace(source, landmarks, size: 112);

      const centerIdx = (56 * 112 + 56) * 3;
      expect(output[centerIdx].toDouble(), closeTo(200, 1));
      expect(output[centerIdx + 1].toDouble(), closeTo(100, 1));
      expect(output[centerIdx + 2].toDouble(), closeTo(50, 1));
    });
  });
}

// SimilarityTransform's a/b fields aren't exposed with scale/rotation
// convenience getters (face_alignment.dart mirrors the backend's internal
// complex representation, not its SimilarityTransform.scale/rotationRadians
// getters) — recomputed here the same way, purely for these tests' own
// assertions.
double _scaleOf(SimilarityTransform t) => math.sqrt(t.a.re * t.a.re + t.a.im * t.a.im);
double _rotationOf(SimilarityTransform t) => math.atan2(t.a.im, t.a.re);
