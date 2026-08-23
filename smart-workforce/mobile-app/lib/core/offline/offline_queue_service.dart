import 'package:hive_flutter/hive_flutter.dart';
import 'package:ai_management_system/core/offline/pending_punch.dart';
import 'package:ai_management_system/core/storage/hive_boxes.dart';

class OfflineQueueService {
  const OfflineQueueService();

  Future<Box<Map>> _openBox() => Hive.openBox<Map>(HiveBoxes.pendingAttendance);

  Future<void> enqueue(PendingPunch punch) async {
    final box = await _openBox();
    await box.put(punch.clientGeneratedId, punch.toJson());
  }

  Future<List<PendingPunch>> getAll() async {
    final box = await _openBox();
    return box.values
        .map((json) => PendingPunch.fromJson(Map<String, dynamic>.from(json)))
        .toList(growable: false);
  }

  Future<void> remove(String clientGeneratedId) async {
    final box = await _openBox();
    await box.delete(clientGeneratedId);
  }

  Future<int> get pendingCount async => (await _openBox()).length;
}
