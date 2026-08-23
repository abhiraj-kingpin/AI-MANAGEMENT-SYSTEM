import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';

class AuthState {
  final bool isBootstrapping;
  final bool isAuthenticated;
  final bool isLoading;
  final UserEntity? user;
  final EmployeeSummaryEntity? employee;
  final String? errorMessage;

  const AuthState({
    this.isBootstrapping = true,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.user,
    this.employee,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isBootstrapping,
    bool? isAuthenticated,
    bool? isLoading,
    UserEntity? user,
    EmployeeSummaryEntity? employee,
    String? errorMessage,
  }) {
    return AuthState(
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      employee: employee ?? this.employee,
      errorMessage: errorMessage,
    );
  }
}
