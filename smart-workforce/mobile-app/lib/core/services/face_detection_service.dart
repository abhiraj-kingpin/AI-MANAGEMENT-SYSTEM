import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart'
    as mlkit;
import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';
import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

class FaceDetectionService {
  final mlkit.FaceDetector _detector;

  FaceDetectionService()
      : _detector = mlkit.FaceDetector(
          options: mlkit.FaceDetectorOptions(
            enableClassification: true,
            enableLandmarks:
                true,
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
        landmark.position.x.toDouble(), landmark.position.y.toDouble(),);
  }

  Future<void> dispose() => _detector.close();
}
