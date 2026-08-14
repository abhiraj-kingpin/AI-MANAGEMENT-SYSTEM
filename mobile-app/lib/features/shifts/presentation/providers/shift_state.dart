import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';

class ShiftState {
  final bool isLoading;

  /// `null` covers two distinct cases the screen tells apart via
  /// [isLoading]/[errorMessage]: "still loading", "failed to load", and
  /// "loaded — genuinely no shift assigned" (`assignment` itself is also
  /// nullable, see `ShiftRemoteDataSource.getMyShift`'s doc comment).
  final ShiftAssignmentEntity? assignment;
  final String? errorMessage;

  const ShiftState({this.isLoading = true, this.assignment, this.errorMessage});

  /// [clearAssignment] exists for the same reason `PayslipState.copyWith`'s
  /// `clearDownloadingId` does: `assignment ?? this.assignment` alone can't
  /// tell "caller omitted this" apart from "caller explicitly wants it
  /// null" — and a refresh genuinely can go from "had a shift" to "no
  /// longer assigned one", which must actually clear the old value rather
  /// than silently keep showing it.
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
