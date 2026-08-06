import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/auth/domain/usecases/check_session_usecase.dart';
import 'package:ai_management_system/features/auth/domain/usecases/login_usecase.dart';
import 'package:ai_management_system/features/auth/domain/usecases/logout_usecase.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_state.dart';

class AuthController extends StateNotifier<AuthState> {
  final LoginUseCase _loginUseCase;
  final LogoutUseCase _logoutUseCase;
  final CheckSessionUseCase _checkSessionUseCase;

  AuthController({
    required LoginUseCase loginUseCase,
    required LogoutUseCase logoutUseCase,
    required CheckSessionUseCase checkSessionUseCase,
  })  : _loginUseCase = loginUseCase,
        _logoutUseCase = logoutUseCase,
        _checkSessionUseCase = checkSessionUseCase,
        super(const AuthState()) {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final user = await _checkSessionUseCase();
    state = state.copyWith(
      isBootstrapping: false,
      isAuthenticated: user != null,
      user: user,
    );
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _loginUseCase(email: email, password: password);
    result.when(
      success: (session) {
        state = state.copyWith(
          isAuthenticated: true,
          isLoading: false,
          user: session.user,
          errorMessage: null,
        );
      },
      failure: (failure) {
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
    );
  }

  Future<void> logout() async {
    await _logoutUseCase();
    state = const AuthState(isBootstrapping: false);
  }
}
