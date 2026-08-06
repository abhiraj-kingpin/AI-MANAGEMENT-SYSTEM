import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:ai_management_system/features/auth/data/repositories_impl/auth_repository_impl.dart';
import 'package:ai_management_system/features/auth/domain/repositories/auth_repository.dart';
import 'package:ai_management_system/features/auth/domain/usecases/check_session_usecase.dart';
import 'package:ai_management_system/features/auth/domain/usecases/login_usecase.dart';
import 'package:ai_management_system/features/auth/domain/usecases/logout_usecase.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_controller.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_state.dart';

final _authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    remoteDataSource: ref.watch(_authRemoteDataSourceProvider),
    secureStorage: ref.watch(secureStorageProvider),
  );
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthController(
    loginUseCase: LoginUseCase(repository),
    logoutUseCase: LogoutUseCase(repository),
    checkSessionUseCase: CheckSessionUseCase(repository),
  );
});
