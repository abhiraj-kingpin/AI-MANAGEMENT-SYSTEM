/// Mirrors `AttendanceDTO` (backend/src/modules/attendance/attendance.types.ts)
/// — only the fields this app's screens actually use, not the full DTO
/// (e.g. no `correctionRequest`, `breaks` — those land with the correction
/// and break-tracking screens, not this one).
class AttendanceEntity {
  final String id;
  final DateTime date;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final String method; // 'gps' | 'qr' | 'face' | 'manual'
  final int workingMinutes;
  final String status; // 'present' | 'late' | 'half_day' | 'absent' | 'on_leave'
  final bool isOvertime;
  final int overtimeMinutes;

  const AttendanceEntity({
    required this.id,
    required this.date,
    required this.checkInAt,
    required this.checkOutAt,
    required this.method,
    required this.workingMinutes,
    required this.status,
    required this.isOvertime,
    required this.overtimeMinutes,
  });

  bool get isCheckedIn => checkInAt != null && checkOutAt == null;

  bool isSameDayAs(DateTime other) {
    return date.year == other.year && date.month == other.month && date.day == other.day;
  }
}
