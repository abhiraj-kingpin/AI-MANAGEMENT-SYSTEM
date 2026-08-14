import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/shifts/data/datasources/shift_remote_datasource.dart';
import 'package:ai_management_system/features/shifts/data/repositories_impl/shift_repository_impl.dart';
import 'package:ai_management_system/features/shifts/domain/repositories/shift_repository.dart';
import 'package:ai_management_system/features/shifts/domain/usecases/get_my_shift_usecase.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_controller.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_state.dart';

final _shiftRemoteDataSourceProvider = Provider<ShiftRemoteDataSource>((ref) {
  return ShiftRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final shiftRepositoryProvider = Provider<ShiftRepository>((ref) {
  return ShiftRepositoryImpl(remoteDataSource: ref.watch(_shiftRemoteDataSourceProvider));
});

final shiftControllerProvider = StateNotifierProvider<ShiftController, ShiftState>((ref) {
  final repository = ref.watch(shiftRepositoryProvider);
  return ShiftController(getMyShiftUseCase: GetMyShiftUseCase(repository));
});
