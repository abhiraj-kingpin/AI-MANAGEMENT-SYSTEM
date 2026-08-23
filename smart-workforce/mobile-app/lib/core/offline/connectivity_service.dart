import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  final Connectivity _connectivity;
  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return _hasConnection(results);
  }

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
