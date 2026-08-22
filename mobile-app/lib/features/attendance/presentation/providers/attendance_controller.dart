import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/break_end_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/break_start_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_with_face_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_with_qr_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_out_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/get_my_attendance_usecase.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';

class AttendanceController extends StateNotifier<AttendanceState> {
  final CheckInUseCase _checkInUseCase;
  final CheckInWithQrUseCase _checkInWithQrUseCase;
  final CheckInWithFaceUseCase _checkInWithFaceUseCase;
  final CheckOutUseCase _checkOutUseCase;
  final BreakStartUseCase _breakStartUseCase;
  final BreakEndUseCase _breakEndUseCase;
  final GetMyAttendanceUseCase _getMyAttendanceUseCase;

  AttendanceController({
    required CheckInUseCase checkInUseCase,
    required CheckInWithQrUseCase checkInWithQrUseCase,
    required CheckInWithFaceUseCase checkInWithFaceUseCase,
    required CheckOutUseCase checkOutUseCase,
    required BreakStartUseCase breakStartUseCase,
    required BreakEndUseCase breakEndUseCase,
    required GetMyAttendanceUseCase getMyAttendanceUseCase,
  })  : _checkInUseCase = checkInUseCase,
        _checkInWithQrUseCase = checkInWithQrUseCase,
        _checkInWithFaceUseCase = checkInWithFaceUseCase,
        _checkOutUseCase = checkOutUseCase,
        _breakStartUseCase = breakStartUseCase,
        _breakEndUseCase = breakEndUseCase,
        _getMyAttendanceUseCase = getMyAttendanceUseCase,
        super(const AttendanceState()) {
    loadHistory();
  }

  Future<void> loadHistory() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _getMyAttendanceUseCase();
    result.when(
      success: (history) {
        state = state.copyWith(
          isLoading: false,
          history: history,
          today: _findToday(history),
        );
      },
      failure: (failure) {
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
    );
  }

  Future<void> checkIn() async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _checkInUseCase();
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  Future<void> checkInWithQr(String qrToken) async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _checkInWithQrUseCase(qrToken);
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  Future<void> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
  }) async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _checkInWithFaceUseCase(
      embedding: embedding,
      livenessPassed: livenessPassed,
    );
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  Future<void> checkOut() async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _checkOutUseCase();
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  Future<void> breakStart() async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _breakStartUseCase();
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  Future<void> breakEnd() async {
    state = state.copyWith(isActionInProgress: true, errorMessage: null, infoMessage: null);
    final result = await _breakEndUseCase();
    await result.when(
      success: (attendance) async {
        state = state.copyWith(isActionInProgress: false, today: attendance);
        await loadHistory();
      },
      failure: (failure) async {
        state = _applyActionFailure(failure);
      },
    );
  }

  AttendanceState _applyActionFailure(Failure failure) {
    if (failure is OfflineQueuedFailure) {
      return state.copyWith(isActionInProgress: false, infoMessage: failure.message);
    }
    return state.copyWith(isActionInProgress: false, errorMessage: failure.message);
  }

  AttendanceEntity? _findToday(List<AttendanceEntity> history) {
    final now = DateTime.now();
    for (final record in history) {
      if (record.isSameDayAs(now)) return record;
    }
    return null;
  }
}
