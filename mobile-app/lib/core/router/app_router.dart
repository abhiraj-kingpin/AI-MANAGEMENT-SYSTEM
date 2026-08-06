import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/features/auth/presentation/screens/login_screen.dart';
import 'package:ai_management_system/features/auth/presentation/screens/splash_screen.dart';
import 'package:ai_management_system/features/home/presentation/screens/home_screen.dart';

const splashPath = '/splash';
const loginPath = '/login';
const homePath = '/';

/// Rebuilds whenever auth state changes (Riverpod re-invokes this provider),
/// and its `redirect` callback enforces: unauthenticated → /login,
/// authenticated → /, and holds on /splash until the launch session check
/// (secure-storage read) finishes. See docs/architecture/07-authentication-flow.md.
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: splashPath,
    redirect: (context, state) {
      final location = state.matchedLocation;

      if (authState.isBootstrapping) {
        return location == splashPath ? null : splashPath;
      }

      final isLoggingIn = location == loginPath;
      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : loginPath;
      }

      if (isLoggingIn || location == splashPath) return homePath;
      return null;
    },
    routes: [
      GoRoute(path: splashPath, builder: (context, state) => const SplashScreen()),
      GoRoute(path: loginPath, builder: (context, state) => const LoginScreen()),
      GoRoute(path: homePath, builder: (context, state) => const HomeScreen()),
    ],
  );
});
