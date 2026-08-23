import 'dart:async';

import 'package:geolocator/geolocator.dart';

class LocationServiceDisabledError implements Exception {
  final String message;
  const LocationServiceDisabledError(this.message);
}

class LocationPermissionDeniedException implements Exception {
  final String message;
  const LocationPermissionDeniedException(this.message);
}

class LocationService {
  const LocationService();

  static const _refineWindow = Duration(seconds: 6);

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
    return Geolocator.getCurrentPosition(locationSettings: settings);
  }
}
