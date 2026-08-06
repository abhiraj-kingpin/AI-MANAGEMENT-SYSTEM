import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/auth/domain/entities/user_entity.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_state.dart';

void main() {
  group('AuthState.copyWith', () {
    test('defaults to a bootstrapping, unauthenticated state', () {
      const state = AuthState();

      expect(state.isBootstrapping, isTrue);
      expect(state.isAuthenticated, isFalse);
      expect(state.user, isNull);
    });

    test('preserves unspecified fields and overrides only what is passed', () {
      const initial = AuthState(
        isBootstrapping: false,
        isAuthenticated: false,
        user: UserEntity(id: '1', email: 'jane@acme.com', role: 'employee'),
      );

      final updated = initial.copyWith(isAuthenticated: true);

      expect(updated.isAuthenticated, isTrue);
      expect(updated.isBootstrapping, isFalse);
      expect(updated.user?.email, 'jane@acme.com');
    });
  });
}
