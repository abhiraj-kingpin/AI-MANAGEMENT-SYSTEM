import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:image/image.dart' as img;
import 'package:onnxruntime/onnxruntime.dart';
import 'package:ai_management_system/features/face/domain/embedding/face_alignment.dart';
import 'package:ai_management_system/features/face/domain/embedding/geometric_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// ⚠️ UNVERIFIED — written to close a documented gap (see
/// `geometric_embedding_generator.dart`'s doc comment, and this project's
/// backend `faceEmbedding.provider.ts`/`faceAlign.ts`, both of which this
/// mirrors), but this environment has no Dart/Flutter SDK at all — not
/// `flutter analyze`, not `flutter test`, not a device or emulator. Nothing
/// in this file, `face_alignment.dart`, or their pubspec/asset changes has
/// ever been compiled, let alone run. That's a materially different
/// verification standard than every other change in this codebase, which
/// was typechecked, linted, and actually executed before being called
/// done — flagged explicitly here, in the README, and in the CHANGELOG
/// rather than left implicit, per this project's standing rule that a
/// placeholder or an unverified change is documented, never silently
/// passed off as equivalent to tested code.
///
/// What real confidence this DOES rest on, despite that: the alignment
/// math (`face_alignment.dart`) is a direct port of the backend's
/// `faceAlign.ts`, itself independently verified by 9 known-answer unit
/// tests; the preprocessing/packing below mirrors
/// `faceEmbedding.provider.ts#toAlignedInputTensor` line for line (same
/// `(pixel-127.5)/128` normalization, same NCHW packing order); the model
/// file is the exact same `w600k_mbf.onnx` (InsightFace `buffalo_s`, MIT
/// license, checksum-recorded in the backend's own README) already proven
/// to produce correctly-shaped, deterministic 512-dim embeddings server-
/// side; and the `onnxruntime` Flutter plugin's API calls below (asset
/// loading, `OrtSession.fromBuffer`, `OrtValueTensor.createTensorWithDataList`,
/// `runAsync`, and the fact that a non-scalar output's `.value` comes back
/// `reshape()`d to the tensor's own dimensions rather than flat) were
/// confirmed by reading that plugin's own README and source on GitHub
/// directly, not guessed from memory or by analogy with the Node binding.
/// What's NOT confirmed: that any of this actually compiles, that
/// `google_mlkit_face_detection`'s landmark positions are accurate enough
/// in practice for this alignment step to converge well, or that the
/// native ONNX runtime this plugin bundles actually initializes correctly
/// on a real device.
///
/// Real ML failing to initialize on a given device (unsupported ABI, the
/// plugin's native library missing, anything) falls back to
/// `GeometricEmbeddingGenerator` — the existing, real, tested placeholder
/// — rather than leaving the whole feature broken. That decision is made
/// exactly once, in [initialize], and never revisited per-frame: mixing
/// 512-dim real embeddings and 67-dim geometric ones within the same
/// registration or check-in attempt would silently corrupt the vector
/// space (backend's `face.service.ts` cosine-matches within one candidate
/// set — see `analytics.ai.service.ts`'s own comment on why mismatched-
/// length pairs are never comparable). If real mode initializes
/// successfully but a *specific* frame's inference later throws, that
/// error propagates instead of silently downgrading just that frame —
/// callers (`FaceCheckInController`, `FaceRegistrationController`) already
/// treat "this one frame failed" as "skip it, try the next one", which is
/// the correct behavior here too, and keeps every frame in one attempt in
/// the same embedding space.
class FaceEmbeddingGenerator {
  static const int _inputSize = 112;
  static const String _modelAssetPath = 'assets/models/w600k_mbf.onnx';
  static const String _inputName = 'input.1';

  final GeometricEmbeddingGenerator _fallback;

  OrtSession? _session;
  bool _initialized = false;
  bool _usingFallback = false;

  FaceEmbeddingGenerator({
    GeometricEmbeddingGenerator fallback = const GeometricEmbeddingGenerator(),
  }) : _fallback = fallback;

  /// True once [initialize] has run and real on-device inference wasn't
  /// available, so every [generate] call this instance's life will use the
  /// geometric fallback instead. Decided once at init, never per-frame —
  /// see the class doc comment for why that matters.
  bool get usingFallback => _usingFallback;

  /// Loads the bundled ONNX model and creates an inference session. Safe
  /// to call more than once (a no-op after the first call). Must complete
  /// before the first [generate] call in a given capture session, so
  /// [usingFallback] is already decided before any frame is captured —
  /// callers should `await` this once, up front, rather than relying on
  /// [generate]'s own lazy-init fallback (kept only so [generate] never
  /// throws just because a caller forgot to call this first).
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    try {
      OrtEnv.instance.init();
      final sessionOptions = OrtSessionOptions();
      final rawAssetFile = await rootBundle.load(_modelAssetPath);
      final bytes = rawAssetFile.buffer.asUint8List();
      _session = OrtSession.fromBuffer(bytes, sessionOptions);
    } catch (error, stackTrace) {
      // Deliberately broad: a missing asset, an unsupported device ABI, a
      // native library load failure, or any other reason real on-device
      // ML can't run here should all degrade to the fallback rather than
      // break face check-in/registration entirely.
      debugPrint('FaceEmbeddingGenerator: real ML init failed, using geometric fallback: $error');
      debugPrintStack(stackTrace: stackTrace);
      _usingFallback = true;
      _session = null;
    }
  }

  /// Generates an embedding for [face], detected in the still frame at
  /// [imagePath] (the same path `CameraService.capture()` /
  /// `FaceDetectionService.detectFromFilePath` already used for detection
  /// — decoded again here since detection and embedding need different
  /// things from the frame: ML Kit works from the file path directly,
  /// real embedding needs actual aligned pixel data).
  Future<List<double>> generate(String imagePath, DetectedFace face) async {
    if (!_initialized) {
      await initialize();
    }
    if (_usingFallback || _session == null) {
      return _fallback.generate(face);
    }
    return _generateReal(imagePath, face);
  }

  Future<List<double>> _generateReal(String imagePath, DetectedFace face) async {
    final bytes = await File(imagePath).readAsBytes();
    final decoded = img.decodeJpg(bytes);
    if (decoded == null) {
      throw StateError('FaceEmbeddingGenerator: could not decode captured frame as JPEG.');
    }

    final landmarks = _insightFaceOrderedLandmarks(face);
    final aligned = warpAlignedFace(decoded, landmarks, size: _inputSize);
    final inputData = _toNchwNormalized(aligned);

    final session = _session!;
    final inputOrt = OrtValueTensor.createTensorWithDataList(
      inputData,
      [1, 3, _inputSize, _inputSize],
    );
    final runOptions = OrtRunOptions();
    List<OrtValue?>? outputs;
    try {
      outputs = await session.runAsync(runOptions, {_inputName: inputOrt});
      final raw = _flattenToDoubles(outputs?.first?.value);
      return _l2Normalize(raw);
    } finally {
      inputOrt.release();
      runOptions.release();
      outputs?.forEach((element) => element?.release());
    }
  }

  /// ML Kit's landmark set is a superset of InsightFace's standard 5 —
  /// this picks the 5 that correspond, in InsightFace's own order (left
  /// eye, right eye, nose tip, left mouth corner, right mouth corner),
  /// matching `REFERENCE_KEYPOINTS_112`'s point order in
  /// `face_alignment.dart` (ported from the backend's own comment on
  /// `Detection.keypoints`). `noseBase` is ML Kit's closest landmark to
  /// InsightFace's "nose tip" — not pixel-identical by definition, but
  /// close enough that the similarity-transform fit (a least-squares fit
  /// over all 5 points, not an exact match) tolerates it, the same way it
  /// tolerates ordinary detector landmark noise on the backend.
  List<Point2D> _insightFaceOrderedLandmarks(DetectedFace face) {
    final ordered = [
      FaceLandmarkName.leftEye,
      FaceLandmarkName.rightEye,
      FaceLandmarkName.noseBase,
      FaceLandmarkName.leftMouth,
      FaceLandmarkName.rightMouth,
    ];
    final points = <Point2D>[];
    for (final name in ordered) {
      final point = face.landmarks[name];
      if (point == null) {
        throw StateError(
          'FaceEmbeddingGenerator: face is missing the "$name" landmark needed for alignment.',
        );
      }
      points.add(point);
    }
    return points;
  }

  /// Planar NCHW, InsightFace's documented `(pixel-127.5)/128`
  /// normalization — a direct port of `faceEmbedding.provider.ts#toAlignedInputTensor`'s
  /// packing loop. [aligned] is `_inputSize*_inputSize*3` interleaved RGB
  /// bytes, exactly what `face_alignment.dart#warpAlignedFace` returns.
  Float32List _toNchwNormalized(Uint8List aligned) {
    final pixelCount = _inputSize * _inputSize;
    final chw = Float32List(3 * pixelCount);
    for (var i = 0; i < pixelCount; i++) {
      chw[i] = (aligned[i * 3] - 127.5) / 128;
      chw[pixelCount + i] = (aligned[i * 3 + 1] - 127.5) / 128;
      chw[2 * pixelCount + i] = (aligned[i * 3 + 2] - 127.5) / 128;
    }
    return chw;
  }

  /// The `onnxruntime` plugin reshapes a non-scalar output's `.value` to
  /// match the tensor's own dimensions (confirmed by reading its source —
  /// see the class doc comment) rather than returning it flat, so a
  /// `[1, 512]` output comes back as `List<List<num>>` (one 512-long inner
  /// list). Recursively flattened here instead of indexing a fixed nesting
  /// depth, so this is correct even if that nesting turns out to have an
  /// extra or missing level once actually run.
  List<double> _flattenToDoubles(Object? value) {
    if (value == null) {
      throw StateError('FaceEmbeddingGenerator: model produced no output.');
    }
    final result = <double>[];
    void flatten(Object? node) {
      if (node is List) {
        for (final child in node) {
          flatten(child);
        }
      } else if (node is num) {
        result.add(node.toDouble());
      } else {
        throw StateError('FaceEmbeddingGenerator: unexpected output element type: ${node.runtimeType}');
      }
    }

    flatten(value);
    return result;
  }

  List<double> _l2Normalize(List<double> vector) {
    final norm = sqrt(vector.fold<double>(0, (sum, v) => sum + v * v));
    if (norm == 0) return vector;
    return vector.map((v) => v / norm).toList(growable: false);
  }

  /// Releases this instance's own session only — deliberately does NOT
  /// call `OrtEnv.instance.release()`. `OrtEnv` is a process-wide
  /// singleton, but a `FaceEmbeddingGenerator` is created fresh per screen
  /// visit (both controllers are `.autoDispose` providers — see
  /// `face_checkin_providers.dart`/`face_registration_providers.dart`), so
  /// releasing the shared env here would break it for the *next* screen
  /// visit unless `OrtEnv.instance.init()` is verified safe to call again
  /// after a `release()` — not something this pass could confirm without a
  /// Flutter environment to test it in. Leaving the env initialized for
  /// the process's lifetime is the safer default until that's checked.
  Future<void> dispose() async {
    _session?.release();
    _session = null;
  }
}
