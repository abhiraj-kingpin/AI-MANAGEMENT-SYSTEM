import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart'
    as mlkit;
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

/// Thin wrapper around `google_mlkit_face_detection` — the only place this
/// app imports that package. Translates its `Face` result into this app's
/// own `DetectedFace` (see that class's doc comment for why), mirroring
/// `LocationService`/`CameraService`'s plugin-wrapping pattern.
class FaceDetectionService {
  final mlkit.FaceDetector _detector;

  FaceDetectionService()
      : _detector = mlkit.FaceDetector(
          options: mlkit.FaceDetectorOptions(
            enableClassification: true, // eye-open probabilities
            enableLandmarks:
                true, // for the geometric embedding + head-turn proxy
            // `.fast`, not `.accurate`. `.accurate` was tried specifically
            // to get a reliable `Face.headEulerAngleY` for check-in's
            // head-turn liveness check, but cost more than speed on real
            // hardware: basic face detection itself got *less* reliable
            // under `.accurate` mode — a real face in full view sometimes
            // came back as zero faces detected, something `.fast` mode
            // didn't do. Check-in no longer needs `headEulerAngleY` at all
            // — see `estimateYawProxy`, which computes an equivalent turn
            // signal from landmarks instead, and landmarks are reported
            // the same regardless of performanceMode.
            performanceMode: mlkit.FaceDetectorMode.fast,
          ),
        );

  static const _landmarkTypeByName = {
    FaceLandmarkName.leftEye: mlkit.FaceLandmarkType.leftEye,
    FaceLandmarkName.rightEye: mlkit.FaceLandmarkType.rightEye,
    FaceLandmarkName.leftEar: mlkit.FaceLandmarkType.leftEar,
    FaceLandmarkName.rightEar: mlkit.FaceLandmarkType.rightEar,
    FaceLandmarkName.leftCheek: mlkit.FaceLandmarkType.leftCheek,
    FaceLandmarkName.rightCheek: mlkit.FaceLandmarkType.rightCheek,
    FaceLandmarkName.noseBase: mlkit.FaceLandmarkType.noseBase,
    FaceLandmarkName.leftMouth: mlkit.FaceLandmarkType.leftMouth,
    FaceLandmarkName.rightMouth: mlkit.FaceLandmarkType.rightMouth,
    FaceLandmarkName.bottomMouth: mlkit.FaceLandmarkType.bottomMouth,
  };

  /// Detects faces in the still frame at [imagePath] (as captured by
  /// `CameraService.capture()`). Returns every face found — callers decide
  /// what "exactly one face" means for their flow (liveness/registration
  /// both reject anything but exactly one).
  Future<List<DetectedFace>> detectFromFilePath(String imagePath) async {
    final inputImage = mlkit.InputImage.fromFilePath(imagePath);
    final faces = await _detector.processImage(inputImage);
    return faces.map(_toDetectedFace).toList(growable: false);
  }

  DetectedFace _toDetectedFace(mlkit.Face face) {
    final landmarks = <FaceLandmarkName, Point2D?>{
      for (final entry in _landmarkTypeByName.entries)
        entry.key: _toPoint2D(face.landmarks[entry.value]),
    };

    return DetectedFace(
      boundingBoxLeft: face.boundingBox.left,
      boundingBoxTop: face.boundingBox.top,
      boundingBoxWidth: face.boundingBox.width,
      boundingBoxHeight: face.boundingBox.height,
      landmarks: landmarks,
      leftEyeOpenProbability: face.leftEyeOpenProbability,
      rightEyeOpenProbability: face.rightEyeOpenProbability,
      headEulerAngleY: face.headEulerAngleY,
    );
  }

  Point2D? _toPoint2D(mlkit.FaceLandmark? landmark) {
    if (landmark == null) return null;
    return Point2D(
        landmark.position.x.toDouble(), landmark.position.y.toDouble());
  }

  Future<void> dispose() => _detector.close();
}
