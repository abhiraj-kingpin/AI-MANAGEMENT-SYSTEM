import 'package:ai_management_system/features/shifts/domain/entities/shift_entity.dart';

class ShiftAssignmentEntity {
  final String id;
  final ShiftEntity shift;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;

  const ShiftAssignmentEntity({
    required this.id,
    required this.shift,
    required this.effectiveFrom,
    this.effectiveTo,
  });
}
