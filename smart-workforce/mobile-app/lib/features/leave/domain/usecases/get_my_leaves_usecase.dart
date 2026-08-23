import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class GetMyLeavesUseCase {
  final LeaveRepository _repository;
  const GetMyLeavesUseCase(this._repository);

  Future<Result<List<LeaveEntity>>> call() => _repository.getMyLeaves();
}
