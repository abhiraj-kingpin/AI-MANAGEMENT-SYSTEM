class ShiftEntity {
  final String id;
  final String name;
  final String type;
  final String startTime;
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
