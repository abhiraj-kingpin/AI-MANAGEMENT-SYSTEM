import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class ApplyLeaveUseCase {
  final LeaveRepository _repository;
  const ApplyLeaveUseCase(this._repository);

  Future<Result<LeaveEntity>> call({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) {
    return _repository.applyLeave(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    );
  }
}
