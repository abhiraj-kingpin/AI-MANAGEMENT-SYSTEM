import 'package:hive_flutter/hive_flutter.dart';

class HiveBoxes {
  HiveBoxes._();

  static const String pendingAttendance = 'pending_attendance_box';

  static Future<void> init() async {
    await Hive.initFlutter();
  }
}
