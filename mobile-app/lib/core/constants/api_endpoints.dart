class ApiEndpoints {
  ApiEndpoints._();

  /// Override at build time: `flutter run --dart-define=API_BASE_URL=https://api.ai-management-system.app/v1`
  /// Default targets the Android emulator's alias for the host machine's localhost.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api/v1',
  );

  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  static const String checkIn = '/attendance/check-in';
  static const String checkOut = '/attendance/check-out';
  static const String myAttendance = '/attendance/me';

  // Leave, shift, payroll, notification endpoints are added here as each
  // module lands — see docs/architecture/04-api-documentation.md.
}
