import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';

class AttendanceModel extends AttendanceEntity {
  const AttendanceModel({
    required super.id,
    required super.date,
    required super.checkInAt,
    required super.checkOutAt,
    required super.method,
    required super.workingMinutes,
    required super.status,
    required super.isOvertime,
    required super.overtimeMinutes,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      checkInAt: json['checkInAt'] != null ? DateTime.parse(json['checkInAt'] as String) : null,
      checkOutAt: json['checkOutAt'] != null ? DateTime.parse(json['checkOutAt'] as String) : null,
      method: json['method'] as String,
      workingMinutes: json['workingMinutes'] as int,
      status: json['status'] as String,
      isOvertime: json['isOvertime'] as bool,
      overtimeMinutes: json['overtimeMinutes'] as int,
    );
  }
}
