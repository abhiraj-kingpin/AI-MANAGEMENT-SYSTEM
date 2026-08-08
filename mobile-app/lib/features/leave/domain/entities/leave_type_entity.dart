/// Mirrors `LeaveTypeDTO` (backend/src/modules/leaves/leaveType.types.ts) —
/// only what the apply form needs (id to submit, name to display).
class LeaveTypeEntity {
  final String id;
  final String name;

  const LeaveTypeEntity({required this.id, required this.name});
}
