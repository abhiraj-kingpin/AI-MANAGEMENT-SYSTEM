import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';

class LeaveState {
  final bool isLoading;
  final bool isActionInProgress;
  final List<LeaveBalanceEntity> balances;
  final List<LeaveEntity> leaves;
  final List<LeaveTypeEntity> leaveTypes;
  final String? errorMessage;

  const LeaveState({
    this.isLoading = true,
    this.isActionInProgress = false,
    this.balances = const [],
    this.leaves = const [],
    this.leaveTypes = const [],
    this.errorMessage,
  });

  LeaveState copyWith({
    bool? isLoading,
    bool? isActionInProgress,
    List<LeaveBalanceEntity>? balances,
    List<LeaveEntity>? leaves,
    List<LeaveTypeEntity>? leaveTypes,
    String? errorMessage,
  }) {
    return LeaveState(
      isLoading: isLoading ?? this.isLoading,
      isActionInProgress: isActionInProgress ?? this.isActionInProgress,
      balances: balances ?? this.balances,
      leaves: leaves ?? this.leaves,
      leaveTypes: leaveTypes ?? this.leaveTypes,
      errorMessage: errorMessage,
    );
  }
}
