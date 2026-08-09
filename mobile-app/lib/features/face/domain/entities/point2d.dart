/// A plain 2D point — this app's own type, kept independent of
/// `google_mlkit_face_detection`'s `Point<int>` (from `dart:math`) so the
/// domain layer never imports the ML Kit package directly; only
/// `core/services/face_detection_service.dart` does that translation.
class Point2D {
  final double x;
  final double y;
  const Point2D(this.x, this.y);
}
