import 'package:connectivity_plus/connectivity_plus.dart';

/// Thin wrapper around `connectivity_plus` — the one place this app checks
/// or listens for network reachability, mirroring `LocationService`'s wrap
/// of `geolocator`.
class ConnectivityService {
  final Connectivity _connectivity;
  // Not `const` — `Connectivity()` itself is a plain (non-const) singleton
  // factory constructor, so this class can't be const either.
  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return _hasConnection(results);
  }

  /// Emits `true` each time the device transitions to having a connection —
  /// `SyncService` listens to this to know when to drain the offline queue.
  /// Doesn't emit on every connectivity change (e.g. wifi → mobile data
  /// while already online), only actual online transitions, so a sync
  /// attempt isn't fired redundantly on every network hiccup.
  Stream<bool> get onConnected {
    var wasOnline = false;
    return _connectivity.onConnectivityChanged.where((results) {
      final isOnline = _hasConnection(results);
      final justCameOnline = isOnline && !wasOnline;
      wasOnline = isOnline;
      return justCameOnline;
    }).map((_) => true);
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}
