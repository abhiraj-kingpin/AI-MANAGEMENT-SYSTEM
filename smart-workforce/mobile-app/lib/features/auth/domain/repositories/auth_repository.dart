import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';

abstract class AuthRepository {
  Future<Result<AuthSessionEntity>> login({
    required String email,
    required String password,
  });

  Future<Result<AuthSessionEntity>> claimAccount({
    required String email,
    required String password,
  });

  Future<void> logout();

  Future<UserEntity?> getCachedUser();

  Future<EmployeeSummaryEntity?> getCachedEmployee();

  /// Re-checks the current session against the server and, if it's now
  /// linked to an employee (e.g. HR added one after this device last logged
  /// in), persists that into the cache so it sticks — including exchanging
  /// for a fresh access token, since employeeId is embedded in the token
  /// itself and a stale one keeps that claim empty for its whole lifetime.
  /// Returns null on any failure or if there's still no link — safe to call
  /// speculatively.
  Future<EmployeeSummaryEntity?> refreshEmployeeLink();

  /// Whether the *currently stored* access token's own claims carry an
  /// employeeId — not whether the cached display data has an employee.
  /// Those two can disagree: a token issued before HR linked the account
  /// keeps an empty employeeId claim for its whole lifetime even after the
  /// cached display employee gets healed, which is what actually causes
  /// Leave/Payslips ("me" endpoints, which read the token's claim) to keep
  /// saying "not linked" after Home already shows the right employee.
  Future<bool> currentAccessTokenHasEmployeeId();
}
