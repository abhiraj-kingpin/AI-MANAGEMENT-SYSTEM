import 'package:ai_management_system/features/shifts/data/models/shift_model.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';

class ShiftAssignmentModel extends ShiftAssignmentEntity {
  const ShiftAssignmentModel({
    required super.id,
    required super.shift,
    required super.effectiveFrom,
    super.effectiveTo,
  });

  factory ShiftAssignmentModel.fromJson(Map<String, dynamic> json) {
    return ShiftAssignmentModel(
      id: json['id'] as String,
      shift: ShiftModel.fromJson(json['shift'] as Map<String, dynamic>),
      effectiveFrom: DateTime.parse(json['effectiveFrom'] as String),
      effectiveTo: json['effectiveTo'] != null
          ? DateTime.parse(json['effectiveTo'] as String)
          : null,
    );
  }
}
