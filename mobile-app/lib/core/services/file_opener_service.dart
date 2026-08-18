import 'package:open_filex/open_filex.dart';

/// An app-owned mirror of `open_filex`'s own `ResultType` — kept separate so
/// nothing outside this file needs to import the plugin's types directly.
enum FileOpenOutcome { opened, noAppAvailable, fileNotFound, permissionDenied, failed }

class FileOpenResult {
  final FileOpenOutcome outcome;
  final String message;
  const FileOpenResult(this.outcome, this.message);
}

/// Thin wrapper around the `open_filex` plugin — the one place it's
/// touched, mirroring [LocationService]'s wrap of `geolocator`. Used to
/// open a payslip PDF `PayslipRepositoryImpl` already saved to disk, in
/// whatever app the device has registered for PDFs.
class FileOpenerService {
  const FileOpenerService();

  Future<FileOpenResult> open(String filePath) async {
    final result = await OpenFilex.open(filePath);
    return FileOpenResult(_toOutcome(result.type), result.message);
  }

  FileOpenOutcome _toOutcome(ResultType type) {
    switch (type) {
      case ResultType.done:
        return FileOpenOutcome.opened;
      case ResultType.noAppToOpen:
        return FileOpenOutcome.noAppAvailable;
      case ResultType.fileNotFound:
        return FileOpenOutcome.fileNotFound;
      case ResultType.permissionDenied:
        return FileOpenOutcome.permissionDenied;
      case ResultType.error:
        return FileOpenOutcome.failed;
    }
  }
}
