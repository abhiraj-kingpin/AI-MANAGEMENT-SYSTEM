import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/app.dart';
import 'package:ai_management_system/core/storage/hive_boxes.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await HiveBoxes.init();

  runApp(const ProviderScope(child: AiManagementSystemApp()));
}
