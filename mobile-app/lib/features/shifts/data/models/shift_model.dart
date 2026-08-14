import 'package:ai_management_system/features/shifts/domain/entities/shift_entity.dart';

class ShiftModel extends ShiftEntity {
  const ShiftModel({
    required super.id,
    required super.name,
    required super.type,
    required super.startTime,
    required super.endTime,
    required super.gracePeriodMinutes,
    required super.isActive,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      gracePeriodMinutes: json['gracePeriodMinutes'] as int,
      isActive: json['isActive'] as bool,
    );
  }
}
