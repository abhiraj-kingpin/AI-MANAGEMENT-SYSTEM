import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';
import 'package:ai_management_system/features/shifts/domain/repositories/shift_repository.dart';

class GetMyShiftUseCase {
  final ShiftRepository _repository;
  const GetMyShiftUseCase(this._repository);

  Future<Result<ShiftAssignmentEntity?>> call() => _repository.getMyShift();
}
