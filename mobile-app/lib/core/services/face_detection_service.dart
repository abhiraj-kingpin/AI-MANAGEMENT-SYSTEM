import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart' as mlkit;
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
            enableClassification: true, // eye-open probabilities, for liveness
            enableLandmarks: true, // for the geometric embedding
            performanceMode: mlkit.FaceDetectorMode.accurate,
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
    );
  }

  Point2D? _toPoint2D(mlkit.FaceLandmark? landmark) {
    if (landmark == null) return null;
    return Point2D(landmark.position.x.toDouble(), landmark.position.y.toDouble());
  }

  Future<void> dispose() => _detector.close();
}
