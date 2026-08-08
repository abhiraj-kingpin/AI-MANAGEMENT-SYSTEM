import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class CancelLeaveUseCase {
  final LeaveRepository _repository;
  const CancelLeaveUseCase(this._repository);

  Future<Result<LeaveEntity>> call(String leaveId) => _repository.cancelLeave(leaveId);
}
