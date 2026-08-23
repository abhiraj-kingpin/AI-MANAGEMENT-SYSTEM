import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/shifts/domain/usecases/get_my_shift_usecase.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_state.dart';

class ShiftController extends StateNotifier<ShiftState> {
  final GetMyShiftUseCase _getMyShiftUseCase;

  ShiftController({required GetMyShiftUseCase getMyShiftUseCase})
      : _getMyShiftUseCase = getMyShiftUseCase,
        super(const ShiftState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _getMyShiftUseCase();
    result.when(
      success: (assignment) {
        state = state.copyWith(
          isLoading: false,
          assignment: assignment,
          clearAssignment: assignment == null,
        );
      },
      failure: (failure) {
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
    );
  }
}
