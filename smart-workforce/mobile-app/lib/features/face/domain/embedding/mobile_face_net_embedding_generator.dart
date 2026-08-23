import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:image/image.dart' as img;
import 'package:onnxruntime/onnxruntime.dart';
import 'package:ai_management_system/features/face/domain/embedding/face_alignment.dart';
import 'package:ai_management_system/features/face/domain/embedding/geometric_embedding_generator.dart';
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

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

  bool get usingFallback => _usingFallback;

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
      debugPrint('FaceEmbeddingGenerator: real ML init failed, using geometric fallback: $error');
      debugPrintStack(stackTrace: stackTrace);
      _usingFallback = true;
      _session = null;
    }
  }

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

  List<Point2D> _insightFaceOrderedLandmarks(DetectedFace face) {
    const ordered = [
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

  Float32List _toNchwNormalized(Uint8List aligned) {
    const pixelCount = _inputSize * _inputSize;
    final chw = Float32List(3 * pixelCount);
    for (var i = 0; i < pixelCount; i++) {
      chw[i] = (aligned[i * 3] - 127.5) / 128;
      chw[pixelCount + i] = (aligned[i * 3 + 1] - 127.5) / 128;
      chw[2 * pixelCount + i] = (aligned[i * 3 + 2] - 127.5) / 128;
    }
    return chw;
  }

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

  Future<void> dispose() async {
    _session?.release();
    _session = null;
  }
}
