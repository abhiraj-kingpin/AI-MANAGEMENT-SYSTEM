import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/attendance/data/datasources/attendance_remote_datasource.dart';
import 'package:ai_management_system/features/attendance/data/repositories_impl/attendance_repository_impl.dart';
import 'package:ai_management_system/features/attendance/domain/repositories/attendance_repository.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/break_end_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/break_start_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_with_face_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_in_with_qr_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/check_out_usecase.dart';
import 'package:ai_management_system/features/attendance/domain/usecases/get_my_attendance_usecase.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_controller.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';

final _attendanceRemoteDataSourceProvider = Provider<AttendanceRemoteDataSource>((ref) {
  return AttendanceRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return AttendanceRepositoryImpl(
    remoteDataSource: ref.watch(_attendanceRemoteDataSourceProvider),
    locationService: ref.watch(locationServiceProvider),
    offlineQueue: ref.watch(offlineQueueServiceProvider),
  );
});

final attendanceControllerProvider =
    StateNotifierProvider<AttendanceController, AttendanceState>((ref) {
  final repository = ref.watch(attendanceRepositoryProvider);
  return AttendanceController(
    checkInUseCase: CheckInUseCase(repository),
    checkInWithQrUseCase: CheckInWithQrUseCase(repository),
    checkInWithFaceUseCase: CheckInWithFaceUseCase(repository),
    checkOutUseCase: CheckOutUseCase(repository),
    breakStartUseCase: BreakStartUseCase(repository),
    breakEndUseCase: BreakEndUseCase(repository),
    getMyAttendanceUseCase: GetMyAttendanceUseCase(repository),
  );
});
