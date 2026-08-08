/// Mirrors `LeaveBalanceDTO` (backend/src/modules/leaves/leave.types.ts).
class LeaveBalanceEntity {
  final String leaveTypeId;
  final String leaveTypeName;
  final int year;
  final num allocated;
  final num used;
  final num carriedForward;
  final num remaining;

  const LeaveBalanceEntity({
    required this.leaveTypeId,
    required this.leaveTypeName,
    required this.year,
    required this.allocated,
    required this.used,
    required this.carriedForward,
    required this.remaining,
  });
}
