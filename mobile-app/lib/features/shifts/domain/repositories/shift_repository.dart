import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';

abstract class ShiftRepository {
  Future<Result<ShiftAssignmentEntity?>> getMyShift();
}
