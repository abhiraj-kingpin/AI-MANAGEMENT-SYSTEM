import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/leave/domain/usecases/apply_leave_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/cancel_leave_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_leave_types_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_my_balance_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_my_leaves_usecase.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_state.dart';

class LeaveController extends StateNotifier<LeaveState> {
  final GetLeaveTypesUseCase _getLeaveTypesUseCase;
  final GetMyBalanceUseCase _getMyBalanceUseCase;
  final GetMyLeavesUseCase _getMyLeavesUseCase;
  final ApplyLeaveUseCase _applyLeaveUseCase;
  final CancelLeaveUseCase _cancelLeaveUseCase;

  LeaveController({
    required GetLeaveTypesUseCase getLeaveTypesUseCase,
    required GetMyBalanceUseCase getMyBalanceUseCase,
    required GetMyLeavesUseCase getMyLeavesUseCase,
    required ApplyLeaveUseCase applyLeaveUseCase,
    required CancelLeaveUseCase cancelLeaveUseCase,
  })  : _getLeaveTypesUseCase = getLeaveTypesUseCase,
        _getMyBalanceUseCase = getMyBalanceUseCase,
        _getMyLeavesUseCase = getMyLeavesUseCase,
        _applyLeaveUseCase = applyLeaveUseCase,
        _cancelLeaveUseCase = cancelLeaveUseCase,
        super(const LeaveState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    String? firstError;

    final typesDone = _getLeaveTypesUseCase().then((result) {
      result.when(
        success: (types) => state = state.copyWith(leaveTypes: types),
        failure: (failure) => firstError ??= failure.message,
      );
    });
    final balanceDone = _getMyBalanceUseCase().then((result) {
      result.when(
        success: (balances) => state = state.copyWith(balances: balances),
        failure: (failure) => firstError ??= failure.message,
      );
    });
    final leavesDone = _getMyLeavesUseCase().then((result) {
      result.when(
        success: (leaves) => state = state.copyWith(leaves: leaves),
        failure: (failure) => firstError ??= failure.message,
      );
    });

    await Future.wait([typesDone, balanceDone, leavesDone]);
    state = state.copyWith(isLoading: false, errorMessage: firstError);
  }

  Future<bool> applyLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null);
    final result = await _applyLeaveUseCase(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    );
    return result.when(
      success: (_) {
        state = state.copyWith(isActionInProgress: false);
        load();
        return true;
      },
      failure: (failure) {
        state = state.copyWith(isActionInProgress: false, errorMessage: failure.message);
        return false;
      },
    );
  }

  Future<void> cancelLeave(String leaveId) async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null);
    final result = await _cancelLeaveUseCase(leaveId);
    result.when(
      success: (_) {
        state = state.copyWith(isActionInProgress: false);
        load();
      },
      failure: (failure) {
        state = state.copyWith(isActionInProgress: false, errorMessage: failure.message);
      },
    );
  }
}
