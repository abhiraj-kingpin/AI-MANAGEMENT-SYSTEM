import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/features/attendance/presentation/screens/attendance_calendar_screen.dart';
import 'package:ai_management_system/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:ai_management_system/features/attendance/presentation/screens/qr_checkin_screen.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/features/auth/presentation/screens/login_screen.dart';
import 'package:ai_management_system/features/auth/presentation/screens/register_screen.dart';
import 'package:ai_management_system/features/auth/presentation/screens/splash_screen.dart';
import 'package:ai_management_system/features/face/presentation/screens/face_checkin_screen.dart';
import 'package:ai_management_system/features/face/presentation/screens/face_registration_screen.dart';
import 'package:ai_management_system/features/home/presentation/screens/home_screen.dart';
import 'package:ai_management_system/features/leave/presentation/screens/leave_screen.dart';
import 'package:ai_management_system/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:ai_management_system/features/payslips/presentation/screens/payslips_screen.dart';
import 'package:ai_management_system/features/shifts/presentation/screens/shift_screen.dart';

const splashPath = '/splash';
const loginPath = '/login';
const registerPath = '/register';
const homePath = '/';
const attendancePath = '/attendance';
const attendanceCalendarPath = '/attendance/calendar';
const qrCheckInPath = '/attendance/qr';
const faceCheckInPath = '/attendance/face';
const faceRegistrationPath = '/face/register';
const leavePath = '/leave';
const payslipsPath = '/payslips';
const notificationsPath = '/notifications';
const shiftPath = '/shifts';

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

      // Both reachable without a session — /register (claiming an
      // HR-created account) is the exact same "not signed in yet" state as
      // /login, just headed to a different eventual outcome.
      final isPublicAuthRoute =
          location == loginPath || location == registerPath;
      if (!authState.isAuthenticated) {
        return isPublicAuthRoute ? null : loginPath;
      }

      if (isPublicAuthRoute || location == splashPath) return homePath;
      return null;
    },
    routes: [
      GoRoute(
          path: splashPath, builder: (context, state) => const SplashScreen()),
      GoRoute(
          path: loginPath, builder: (context, state) => const LoginScreen()),
      GoRoute(
          path: registerPath,
          builder: (context, state) => const RegisterScreen()),
      GoRoute(path: homePath, builder: (context, state) => const HomeScreen()),
      GoRoute(
          path: attendancePath,
          builder: (context, state) => const AttendanceScreen()),
      GoRoute(
        path: attendanceCalendarPath,
        builder: (context, state) => const AttendanceCalendarScreen(),
      ),
      GoRoute(
          path: qrCheckInPath,
          builder: (context, state) => const QrCheckInScreen()),
      GoRoute(
          path: faceCheckInPath,
          builder: (context, state) => const FaceCheckInScreen()),
      GoRoute(
        path: faceRegistrationPath,
        builder: (context, state) => const FaceRegistrationScreen(),
      ),
      GoRoute(
          path: leavePath, builder: (context, state) => const LeaveScreen()),
      GoRoute(
          path: payslipsPath,
          builder: (context, state) => const PayslipsScreen()),
      GoRoute(
          path: notificationsPath,
          builder: (context, state) => const NotificationsScreen()),
      GoRoute(
          path: shiftPath, builder: (context, state) => const ShiftScreen()),
    ],
  );
});
