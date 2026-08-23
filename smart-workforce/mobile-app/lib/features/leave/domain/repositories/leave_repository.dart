import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';

abstract class LeaveRepository {
  Future<Result<List<LeaveTypeEntity>>> getLeaveTypes();
  Future<Result<List<LeaveBalanceEntity>>> getMyBalance();
  Future<Result<List<LeaveEntity>>> getMyLeaves();

  Future<Result<LeaveEntity>> applyLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  });

  Future<Result<LeaveEntity>> cancelLeave(String leaveId);
}
