import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';

class ShiftState {
  final bool isLoading;

  final ShiftAssignmentEntity? assignment;
  final String? errorMessage;

  const ShiftState({this.isLoading = true, this.assignment, this.errorMessage});

  ShiftState copyWith({
    bool? isLoading,
    ShiftAssignmentEntity? assignment,
    bool clearAssignment = false,
    String? errorMessage,
  }) {
    return ShiftState(
      isLoading: isLoading ?? this.isLoading,
      assignment: clearAssignment ? null : (assignment ?? this.assignment),
      errorMessage: errorMessage,
    );
  }
}
