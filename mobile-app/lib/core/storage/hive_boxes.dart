import 'package:hive_flutter/hive_flutter.dart';

/// Local box registry for offline-first data. `pendingAttendance` is opened
/// by `core/offline/offline_queue_service.dart` as a plain `Box<Map>` — no
/// generated `TypeAdapter` (this project has no `build_runner` step), each
/// entry is just a `PendingPunch.toJson()` map keyed by `clientGeneratedId`.
class HiveBoxes {
  HiveBoxes._();

  static const String pendingAttendance = 'pending_attendance_box';

  static Future<void> init() async {
    await Hive.initFlutter();
  }
}
