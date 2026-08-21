import 'dart:async';

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

  /// How long to keep sampling for a better fix before settling for
  /// whatever's best so far.
  static const _refineWindow = Duration(seconds: 6);

  /// Requests location permission if not already granted, then returns the
  /// most accurate position read within a short sampling window — not just
  /// whatever the first fix happens to be. A single `getCurrentPosition()`
  /// call frequently returns the device's *first* GPS fix after the radio
  /// wakes up, which is commonly 30–50m off true position (or a
  /// network/Wi-Fi-assisted fallback fix) rather than a real GPS lock; for a
  /// geofence check-in — where being wrong by 30m can be the difference
  /// between inside and outside the office radius — that first fix isn't
  /// good enough to act on. This instead listens to a short burst of
  /// updates at the platform's highest precision setting and keeps
  /// whichever one reports the smallest `accuracy` (meters), the same
  /// "wait briefly, keep the best" pattern the `geolocator` package's own
  /// docs recommend for exactly this class of problem.
  ///
  /// Throws [LocationServiceDisabledError] or
  /// [LocationPermissionDeniedException] rather than a raw plugin
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

    const settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 0,
    );

    Position? best;
    final completer = Completer<Position>();
    final sub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (position) {
        if (best == null || position.accuracy < best!.accuracy) {
          best = position;
        }
        // A fix this tight is as good as this sampling window is going to
        // find — no reason to keep draining battery/time waiting it out.
        if (position.accuracy <= 10 && !completer.isCompleted) {
          completer.complete(position);
        }
      },
      onError: completer.completeError,
    );

    final result = await Future.any([
      completer.future,
      Future<Position?>.delayed(_refineWindow, () => null),
    ]);
    await sub.cancel();

    if (result != null) return result;
    if (best != null) return best!;
    // The stream never produced a single reading in the whole window
    // (rare — a genuinely GPS-hostile environment) — a plain single-shot
    // read is still better than failing the check-in outright.
    return Geolocator.getCurrentPosition(locationSettings: settings);
  }
}
