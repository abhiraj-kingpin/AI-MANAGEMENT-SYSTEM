import 'package:ai_management_system/features/face/domain/entities/detected_face.dart';

double? estimateYawProxy(DetectedFace face) {
  final leftEye = face.landmarks[FaceLandmarkName.leftEye];
  final rightEye = face.landmarks[FaceLandmarkName.rightEye];
  final nose = face.landmarks[FaceLandmarkName.noseBase];
  if (leftEye == null || rightEye == null || nose == null) return null;

  final eyeMidX = (leftEye.x + rightEye.x) / 2;
  final interEyeDistance = (rightEye.x - leftEye.x).abs();
  if (interEyeDistance < 1) return null;

  return (nose.x - eyeMidX) / interEyeDistance;
}
