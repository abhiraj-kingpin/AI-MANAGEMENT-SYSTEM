import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';

class GetMyBalanceUseCase {
  final LeaveRepository _repository;
  const GetMyBalanceUseCase(this._repository);

  Future<Result<List<LeaveBalanceEntity>>> call() => _repository.getMyBalance();
}
