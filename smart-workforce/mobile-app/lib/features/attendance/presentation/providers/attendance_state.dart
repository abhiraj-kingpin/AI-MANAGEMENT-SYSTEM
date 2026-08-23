import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';

class AttendanceState {
  final bool isLoading;
  final bool isActionInProgress;
  final AttendanceEntity? today;
  final List<AttendanceEntity> history;
  final String? errorMessage;

  final String? infoMessage;

  const AttendanceState({
    this.isLoading = true,
    this.isActionInProgress = false,
    this.today,
    this.history = const [],
    this.errorMessage,
    this.infoMessage,
  });

  AttendanceState copyWith({
    bool? isLoading,
    bool? isActionInProgress,
    AttendanceEntity? today,
    List<AttendanceEntity>? history,
    String? errorMessage,
    String? infoMessage,
  }) {
    return AttendanceState(
      isLoading: isLoading ?? this.isLoading,
      isActionInProgress: isActionInProgress ?? this.isActionInProgress,
      today: today ?? this.today,
      history: history ?? this.history,
      errorMessage: errorMessage,
      infoMessage: infoMessage,
    );
  }
}
