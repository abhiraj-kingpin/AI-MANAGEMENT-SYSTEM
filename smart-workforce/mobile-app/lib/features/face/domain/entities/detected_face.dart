import 'package:ai_management_system/features/face/domain/entities/point2d.dart';

enum FaceLandmarkName {
  leftEye,
  rightEye,
  leftEar,
  rightEar,
  leftCheek,
  rightCheek,
  noseBase,
  leftMouth,
  rightMouth,
  bottomMouth,
}

class DetectedFace {
  final double boundingBoxLeft;
  final double boundingBoxTop;
  final double boundingBoxWidth;
  final double boundingBoxHeight;

  final Map<FaceLandmarkName, Point2D?> landmarks;

  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;

  final double? headEulerAngleY;

  const DetectedFace({
    required this.boundingBoxLeft,
    required this.boundingBoxTop,
    required this.boundingBoxWidth,
    required this.boundingBoxHeight,
    required this.landmarks,
    required this.leftEyeOpenProbability,
    required this.rightEyeOpenProbability,
    required this.headEulerAngleY,
  });
}
