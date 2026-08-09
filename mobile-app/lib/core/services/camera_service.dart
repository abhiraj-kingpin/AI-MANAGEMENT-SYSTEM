import 'package:camera/camera.dart';

/// Thrown when no front-facing camera exists on the device (or no camera
/// at all) — face check-in has no fallback for this, unlike GPS's
/// "check-out works without a fix" leniency, since the whole feature is
/// meaningless without a selfie camera.
class NoFrontCameraException implements Exception {
  final String message;
  const NoFrontCameraException(this.message);
}

/// Thin wrapper around the `camera` plugin — the one place this app opens
/// a camera session, mirroring `LocationService`'s wrap of `geolocator`.
/// Doesn't request camera permission itself: the plugin's own
/// `CameraController.initialize()` triggers the OS's native runtime
/// permission prompt on both Android and iOS when it isn't already
/// granted (no `permission_handler` dependency needed just for this).
class CameraService {
  CameraController? _controller;

  /// Finds the front-facing camera and initializes a controller against
  /// it, ready for [capture]. Callers must [dispose] when done — a face
  /// check-in screen does this in its own `dispose()`.
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
    await controller.initialize();
    _controller = controller;
    return controller;
  }

  /// Captures a single still frame to a temporary file and returns its
  /// path — face detection reads from that path via
  /// `InputImage.fromFilePath` rather than raw byte streaming, which needs
  /// no manual rotation/format handling per platform.
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
