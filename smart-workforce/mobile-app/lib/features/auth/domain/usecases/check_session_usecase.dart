import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';
import 'package:ai_management_system/features/auth/domain/repositories/auth_repository.dart';

class CachedSession {
  final UserEntity? user;
  final EmployeeSummaryEntity? employee;
  const CachedSession({required this.user, required this.employee});
}

class CheckSessionUseCase {
  final AuthRepository _repository;
  const CheckSessionUseCase(this._repository);

  Future<CachedSession> call() async {
    final user = await _repository.getCachedUser();
    var employee = await _repository.getCachedEmployee();

    // A session cached from before HR linked this account to an employee
    // (e.g. tested before Add Employee worked, or claimed the instant it
    // was created) would otherwise say "not linked" forever, even after
    // the link exists — self-heal it here, rather than making that a
    // logout-and-back-in problem for the employee to figure out.
    //
    // Checking `employee == null` alone isn't enough: refreshEmployeeLink
    // updates the cached *display* employee, but the actual access token
    // has its own embedded employeeId claim that Leave/Payslips read —
    // once the display cache is healed on a previous run, employee is no
    // longer null here even though the token itself is still stale. Gate
    // on the token's own claim instead, so this keeps healing until the
    // token itself actually carries employeeId.
    if (user != null) {
      final tokenHasEmployeeId = await _repository.currentAccessTokenHasEmployeeId();
      if (!tokenHasEmployeeId) {
        employee = await _repository.refreshEmployeeLink();
      }
    }

    return CachedSession(user: user, employee: employee);
  }
}
