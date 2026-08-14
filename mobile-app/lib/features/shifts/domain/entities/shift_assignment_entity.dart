import 'package:ai_management_system/features/shifts/domain/entities/shift_entity.dart';

/// Mirrors the backend's `ShiftAssignmentDTO` — one employee's assignment
/// to a `ShiftEntity`, effective over a date range. `GET /shifts/me`
/// (`shiftAssignmentService.getMyShift`) already resolves this down to
/// "the assignment effective today, if any" server-side, so unlike
/// `AttendanceEntity.isSameDayAs`/`isCheckedIn`, there's no equivalent
/// "is this still effective" logic to duplicate on the client.
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
