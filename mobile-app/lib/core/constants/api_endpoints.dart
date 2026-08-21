class ApiEndpoints {
  ApiEndpoints._();

  /// Override at build time: `flutter run --dart-define=API_BASE_URL=https://api.ai-management-system.app/v1`
  /// Default targets the Android emulator's alias for the host machine's localhost.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api/v1',
  );

  static const String login = '/auth/login';
  static const String claimAccount = '/auth/claim-account';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  static const String checkIn = '/attendance/check-in';
  static const String checkOut = '/attendance/check-out';
  static const String myAttendance = '/attendance/me';
  static const String attendanceSync = '/attendance/sync';

  static const String faceRegisterEmbeddings = '/face/register-embeddings';
  static const String faceRegistrationStatus = '/face/registration-status';

  static const String myShift = '/shifts/me';

  static const String leaveTypes = '/leave-types';
  static const String leaves = '/leaves';
  static const String myLeaves = '/leaves/me';
  static const String myLeaveBalance = '/leaves/balance';
  static String cancelLeave(String id) => '/leaves/$id/cancel';

  static const String myPayslips = '/payslips/me';
  static String payslipPdf(String id) => '/payslips/$id/pdf';

  static const String myNotifications = '/notifications/me';
  static const String markAllNotificationsRead = '/notifications/read-all';
  static String markNotificationRead(String id) => '/notifications/$id/read';

  // Shift endpoints are added here once that screen lands — see
  // docs/architecture/04-api-documentation.md.
}
