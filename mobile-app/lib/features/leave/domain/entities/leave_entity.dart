/// Mirrors `LeaveDTO` (backend/src/modules/leaves/leave.types.ts) — the
/// self-service fields only; `employee` never appears on `/leaves/me`,
/// which is all this app ever calls (there's no HR review queue here).
class LeaveEntity {
  final String id;
  final String leaveTypeId;
  final String? leaveTypeName;
  final DateTime startDate;
  final DateTime endDate;
  final double totalDays;
  final String reason;
  final String status; // 'pending' | 'approved' | 'rejected' | 'cancelled'
  final DateTime createdAt;

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
  });

  /// Mirrors the exact rule `leave.service.ts#cancel` enforces server-side:
  /// pending is always cancellable; an already-approved leave only if it
  /// hasn't started yet. A UI convenience to hide the button rather than
  /// let it 400 — the server re-checks this regardless.
  bool get isCancellable {
    if (status == 'pending') return true;
    return status == 'approved' && startDate.isAfter(DateTime.now());
  }
}
