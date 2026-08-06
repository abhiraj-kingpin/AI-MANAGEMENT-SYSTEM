import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';

class AuthState {
  /// True only until the app-launch session check (secure storage read)
  /// completes — gates routing so we never flash the login screen for a
  /// user who's already signed in.
  final bool isBootstrapping;
  final bool isAuthenticated;
  final bool isLoading;
  final UserEntity? user;
  final String? errorMessage;

  const AuthState({
    this.isBootstrapping = true,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isBootstrapping,
    bool? isAuthenticated,
    bool? isLoading,
    UserEntity? user,
    String? errorMessage,
  }) {
    return AuthState(
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}
