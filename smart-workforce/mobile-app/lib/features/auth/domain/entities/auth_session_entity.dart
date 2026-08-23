import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';

class AuthSessionEntity {
  final String accessToken;
  final String refreshToken;
  final UserEntity user;
  final EmployeeSummaryEntity? employee;

  const AuthSessionEntity({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    this.employee,
  });
}
