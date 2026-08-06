import 'package:hive_flutter/hive_flutter.dart';

/// Local box registry for offline-first data. Only initialization lives here
/// in Phase 1 — typed adapters (e.g. `PendingPunchAdapter`) and the boxes
/// that use them are registered from Phase 13 (Offline Mode) onward, once
/// the offline attendance queue model exists.
class HiveBoxes {
  HiveBoxes._();

  static const String pendingAttendance = 'pending_attendance_box';

  static Future<void> init() async {
    await Hive.initFlutter();
  }
}
