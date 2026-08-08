import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class GetLeaveTypesUseCase {
  final LeaveRepository _repository;
  const GetLeaveTypesUseCase(this._repository);

  Future<Result<List<LeaveTypeEntity>>> call() => _repository.getLeaveTypes();
}
