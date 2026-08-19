import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// ⚠️ UNVERIFIED — see `mobile_face_net_embedding_generator.dart`'s doc
/// comment for why (no Dart/Flutter SDK in the environment that wrote this,
/// so nothing here has ever been compiled or run).
///
/// A line-for-line port of the backend's already-proven
/// `backend/src/modules/face-recognition/faceAlign.ts` — same reference
/// template, same closed-form similarity-transform math, same inverse-
/// mapped bilinear warp. Ported rather than re-derived so this carries the
/// same correctness argument that file's doc comment and
/// `faceAlign.test.ts`'s known-answer tests already established (identity,
/// a known 2x scale, a known 90-degree rotation, a known translation — all
/// ported to `test/unit/face_alignment_test.dart`, though "ported" here
/// also means "never run", for the same reason).

/// InsightFace's standard 112x112 face-alignment reference template
/// ("arcface_dst") — see the backend's `faceAlign.ts` for provenance
/// (fetched from InsightFace's own `utils/face_align.py`, not guessed).
const List<Point2D> referenceKeypoints112 = [
  Point2D(38.2946, 51.6963),
  Point2D(73.5318, 51.5014),
  Point2D(56.0252, 71.7366),
  Point2D(41.5493, 92.3655),
  Point2D(70.7299, 92.2041),
];

class _Complex {
  final double re;
  final double im;
  const _Complex(this.re, this.im);
}

class SimilarityTransform {
  /// Forward transform: dst ~= a*src + b, in complex-number form.
  final _Complex a;
  final _Complex b;

  const SimilarityTransform(this.a, this.b);
}

class AlignmentError implements Exception {
  final String message;
  const AlignmentError(this.message);

  @override
  String toString() => 'AlignmentError: $message';
}

Point2D _meanPoint(List<Point2D> points) {
  var x = 0.0, y = 0.0;
  for (final p in points) {
    x += p.x;
    y += p.y;
  }
  return Point2D(x / points.length, y / points.length);
}

/// Least-squares best-fit 2D similarity transform (uniform scale + rotation
/// + translation, no shear/reflection) mapping [src] points onto [dst]
/// points — see the backend `faceAlign.ts`'s `estimateSimilarityTransform`
/// for the full derivation (complex-plane least-squares fit for
/// `dst_i ~= a*src_i + b`, `a = sum(conj(src_i')*dst_i') / sum(|src_i'|^2)`
/// over mean-centered points).
SimilarityTransform estimateSimilarityTransform(List<Point2D> src, List<Point2D> dst) {
  if (src.length != dst.length) {
    throw const AlignmentError('estimateSimilarityTransform: src and dst must have the same length.');
  }
  if (src.length < 2) {
    throw const AlignmentError('estimateSimilarityTransform: need at least 2 point correspondences.');
  }

  final srcMean = _meanPoint(src);
  final dstMean = _meanPoint(dst);

  var numRe = 0.0, numIm = 0.0, den = 0.0;
  for (var i = 0; i < src.length; i++) {
    final px = src[i].x - srcMean.x;
    final py = src[i].y - srcMean.y;
    final qx = dst[i].x - dstMean.x;
    final qy = dst[i].y - dstMean.y;
    numRe += px * qx + py * qy;
    numIm += px * qy - py * qx;
    den += px * px + py * py;
  }
  if (den == 0) {
    throw const AlignmentError('estimateSimilarityTransform: source points are degenerate (all identical).');
  }

  final aRe = numRe / den;
  final aIm = numIm / den;
  final bRe = dstMean.x - (aRe * srcMean.x - aIm * srcMean.y);
  final bIm = dstMean.y - (aIm * srcMean.x + aRe * srcMean.y);

  return SimilarityTransform(_Complex(aRe, aIm), _Complex(bRe, bIm));
}

/// One RGB pixel, as three 0-255 byte values.
class _Rgb {
  final int r, g, b;
  const _Rgb(this.r, this.g, this.b);
}

/// Black border for out-of-bounds samples — matches the backend's
/// `bilinearSample` (itself matching `cv2.warpAffine`'s default
/// `borderValue=0.0`).
_Rgb _bilinearSample(img.Image source, double x, double y) {
  if (x < 0 || y < 0 || x > source.width - 1 || y > source.height - 1) {
    return const _Rgb(0, 0, 0);
  }

  final x0 = x.floor();
  final y0 = y.floor();
  // Deliberately not `.clamp()` — `num.clamp()` returns `num`, not `int`,
  // even when called on an `int` receiver, and `getPixel` requires `int`.
  final maxX = source.width - 1;
  final maxY = source.height - 1;
  final x1 = x0 + 1 > maxX ? maxX : x0 + 1;
  final y1 = y0 + 1 > maxY ? maxY : y0 + 1;
  final fx = x - x0;
  final fy = y - y0;

  final p00 = source.getPixel(x0, y0);
  final p10 = source.getPixel(x1, y0);
  final p01 = source.getPixel(x0, y1);
  final p11 = source.getPixel(x1, y1);

  int channel(num c00, num c10, num c01, num c11) {
    final top = c00 * (1 - fx) + c10 * fx;
    final bottom = c01 * (1 - fx) + c11 * fx;
    return (top * (1 - fy) + bottom * fy).round();
  }

  return _Rgb(
    channel(p00.r, p10.r, p01.r, p11.r),
    channel(p00.g, p10.g, p01.g, p11.g),
    channel(p00.b, p10.b, p01.b, p11.b),
  );
}

/// Warps a `size`x`size` crop out of [source] such that [landmarks] land on
/// [referenceKeypoints112] (scaled to `size`, if not 112) — the standard
/// InsightFace face-alignment crop MobileFaceNet was trained on. Returns
/// interleaved RGB bytes, `size*size*3` long, row-major — the same layout
/// the backend's `warpAlignedFace` returns, so the NCHW-packing step in
/// `mobile_face_net_embedding_generator.dart` can be a direct port too.
Uint8List warpAlignedFace(img.Image source, List<Point2D> landmarks, {int size = 112}) {
  final referencePoints = size == 112
      ? referenceKeypoints112
      : referenceKeypoints112.map((p) => Point2D((p.x / 112) * size, (p.y / 112) * size)).toList();

  final transform = estimateSimilarityTransform(landmarks, referencePoints);
  final a = transform.a;
  final b = transform.b;
  // Inverse of the rotation-scale matrix [[a.re,-a.im],[a.im,a.re]] is
  // (1/det)*[[a.re,a.im],[-a.im,a.re]] -- det = a.re^2 + a.im^2 = scale^2.
  final det = a.re * a.re + a.im * a.im;

  final output = Uint8List(size * size * 3);

  for (var oy = 0; oy < size; oy++) {
    for (var ox = 0; ox < size; ox++) {
      final dx = ox - b.re;
      final dy = oy - b.im;
      final sx = (a.re * dx + a.im * dy) / det;
      final sy = (-a.im * dx + a.re * dy) / det;

      final rgb = _bilinearSample(source, sx, sy);
      final outIdx = (oy * size + ox) * 3;
      output[outIdx] = rgb.r;
      output[outIdx + 1] = rgb.g;
      output[outIdx + 2] = rgb.b;
    }
  }

  return output;
}
