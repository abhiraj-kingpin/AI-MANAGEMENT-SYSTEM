import 'package:open_filex/open_filex.dart';

enum FileOpenOutcome { opened, noAppAvailable, fileNotFound, permissionDenied, failed }

class FileOpenResult {
  final FileOpenOutcome outcome;
  final String message;
  const FileOpenResult(this.outcome, this.message);
}

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
