import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';

class LeaveTypeModel extends LeaveTypeEntity {
  const LeaveTypeModel({required super.id, required super.name});

  factory LeaveTypeModel.fromJson(Map<String, dynamic> json) {
    return LeaveTypeModel(id: json['id'] as String, name: json['name'] as String);
  }
}
