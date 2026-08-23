import 'package:camera/camera.dart';

class NoFrontCameraException implements Exception {
  final String message;
  const NoFrontCameraException(this.message);
}

/// Distinct from a generic camera failure so the UI can point the user at
/// Settings instead of just saying "try again" — denying camera permission
/// (or having denied it before, without "don't ask again") previously fell
/// through to the same generic "Could not start the camera" message as any
/// other failure, which doesn't tell the user what's actually wrong or how
/// to fix it.
class CameraPermissionDeniedException implements Exception {
  final String message;
  const CameraPermissionDeniedException(this.message);
}

class CameraService {
  CameraController? _controller;

  Future<CameraController> initializeFrontCamera() async {
    final cameras = await availableCameras();
    final frontCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.front,
      orElse: () {
        throw const NoFrontCameraException('This device has no front-facing camera.');
      },
    );

    final controller = CameraController(
      frontCamera,
      ResolutionPreset.medium,
      enableAudio: false,
    );
    try {
      await controller.initialize();
    } on CameraException catch (e) {
      // Android's camera plugin reports denied permission via this code
      // (CameraAccessDenied) rather than a distinct exception type.
      if (e.code == 'CameraAccessDenied' || e.code == 'CameraAccessDeniedWithoutPrompt') {
        throw const CameraPermissionDeniedException(
          'Camera access is turned off for this app. Enable it in your phone\'s Settings to continue.',
        );
      }
      rethrow;
    }
    _controller = controller;
    return controller;
  }

  Future<String> capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      throw StateError('Camera not initialized — call initializeFrontCamera() first.');
    }
    final file = await controller.takePicture();
    return file.path;
  }

  Future<void> dispose() async {
    await _controller?.dispose();
    _controller = null;
  }
}
