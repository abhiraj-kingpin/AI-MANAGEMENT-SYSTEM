import 'package:geolocator/geolocator.dart';

/// Thrown when the device's location services (GPS) are turned off entirely.
class LocationServiceDisabledError implements Exception {
  final String message;
  const LocationServiceDisabledError(this.message);
}

/// Thrown when the user has denied (or permanently denied) location access.
class LocationPermissionDeniedException implements Exception {
  final String message;
  const LocationPermissionDeniedException(this.message);
}

/// Thin wrapper around the `geolocator` plugin — the one place permission
/// requests and GPS reads happen, mirroring [SecureStorageService]'s wrap of
/// `flutter_secure_storage`. Kept out of the repository layer so
/// `AttendanceRepositoryImpl` depends on this narrow interface rather than
/// the plugin directly.
class LocationService {
  const LocationService();

  /// Requests location permission if not already granted, then reads the
  /// current position at high accuracy. Throws [LocationServiceDisabledError]
  /// or [LocationPermissionDeniedException] rather than a raw plugin
  /// exception, so callers get a message they can show directly.
  Future<Position> getCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceDisabledError(
        'Location services are turned off. Enable them to check in.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const LocationPermissionDeniedException(
        'Location permission is required to check in.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  }
}
