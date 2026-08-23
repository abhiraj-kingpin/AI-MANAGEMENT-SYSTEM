import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/leave/data/datasources/leave_remote_datasource.dart';
import 'package:ai_management_system/features/leave/data/repositories_impl/leave_repository_impl.dart';
import 'package:ai_management_system/features/leave/domain/repositories/leave_repository.dart';
import 'package:ai_management_system/features/leave/domain/usecases/apply_leave_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/cancel_leave_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_leave_types_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_my_balance_usecase.dart';
import 'package:ai_management_system/features/leave/domain/usecases/get_my_leaves_usecase.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_controller.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_state.dart';

final _leaveRemoteDataSourceProvider = Provider<LeaveRemoteDataSource>((ref) {
  return LeaveRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final leaveRepositoryProvider = Provider<LeaveRepository>((ref) {
  return LeaveRepositoryImpl(remoteDataSource: ref.watch(_leaveRemoteDataSourceProvider));
});

final leaveControllerProvider = StateNotifierProvider<LeaveController, LeaveState>((ref) {
  final repository = ref.watch(leaveRepositoryProvider);
  return LeaveController(
    getLeaveTypesUseCase: GetLeaveTypesUseCase(repository),
    getMyBalanceUseCase: GetMyBalanceUseCase(repository),
    getMyLeavesUseCase: GetMyLeavesUseCase(repository),
    applyLeaveUseCase: ApplyLeaveUseCase(repository),
    cancelLeaveUseCase: CancelLeaveUseCase(repository),
  );
});
