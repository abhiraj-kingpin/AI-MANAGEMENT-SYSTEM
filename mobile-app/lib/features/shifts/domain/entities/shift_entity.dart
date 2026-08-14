/// Mirrors the backend's `ShiftDTO` — a shift *definition* (name, type,
/// start/end time, grace period), not an individual employee's assignment
/// to one (see `ShiftAssignmentEntity` for that).
class ShiftEntity {
  final String id;
  final String name;
  final String type; // 'morning' | 'night' | 'rotational' | 'flexible'
  final String startTime; // 'HH:mm', 24-hour, same convention as the backend
  final String endTime;
  final int gracePeriodMinutes;
  final bool isActive;

  const ShiftEntity({
    required this.id,
    required this.name,
    required this.type,
    required this.startTime,
    required this.endTime,
    required this.gracePeriodMinutes,
    required this.isActive,
  });
}
