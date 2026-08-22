class BreakEntity {
  final DateTime start;
  final DateTime? end;

  const BreakEntity({required this.start, required this.end});

  bool get isOpen => end == null;
}

class AttendanceEntity {
  final String id;
  final DateTime date;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final String method;
  final int workingMinutes;
  final String status;
  final bool isOvertime;
  final int overtimeMinutes;
  final List<BreakEntity> breaks;

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
    this.breaks = const [],
  });

  bool get isCheckedIn => checkInAt != null && checkOutAt == null;

  bool get hasOpenBreak => breaks.any((b) => b.isOpen);

  bool isSameDayAs(DateTime other) {
    return date.year == other.year && date.month == other.month && date.day == other.day;
  }
}
