class LeaveEntity {
  final String id;
  final String leaveTypeId;
  final String? leaveTypeName;
  final DateTime startDate;
  final DateTime endDate;
  final double totalDays;
  final String reason;
  final String status;
  final DateTime createdAt;
  final String? managerComment;

  const LeaveEntity({
    required this.id,
    required this.leaveTypeId,
    required this.leaveTypeName,
    required this.startDate,
    required this.endDate,
    required this.totalDays,
    required this.reason,
    required this.status,
    required this.createdAt,
    this.managerComment,
  });

  bool get isCancellable {
    if (status == 'pending') return true;
    return status == 'approved' && startDate.isAfter(DateTime.now());
  }
}
