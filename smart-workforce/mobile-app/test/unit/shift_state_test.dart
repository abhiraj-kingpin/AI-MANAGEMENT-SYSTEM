import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_entity.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_state.dart';

ShiftAssignmentEntity _fakeAssignment() {
  return ShiftAssignmentEntity(
    id: 'sa1',
    shift: const ShiftEntity(
      id: 's1',
      name: 'Morning Shift',
      type: 'morning',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      isActive: true,
    ),
    effectiveFrom: DateTime.utc(2026, 1, 1),
  );
}

void main() {
  group('ShiftState.copyWith', () {
    test('defaults to loading with no assignment', () {
      const state = ShiftState();

      expect(state.isLoading, isTrue);
      expect(state.assignment, isNull);
    });

    test('omitting assignment preserves the existing one', () {
      final loaded = ShiftState(isLoading: false, assignment: _fakeAssignment());

      final refreshing = loaded.copyWith(isLoading: true);

      expect(refreshing.assignment, isNotNull);
      expect(refreshing.isLoading, isTrue);
    });

    test('clearAssignment explicitly clears a previously-loaded assignment', () {
      final loaded = ShiftState(isLoading: false, assignment: _fakeAssignment());

      final cleared = loaded.copyWith(isLoading: false, clearAssignment: true);

      expect(cleared.assignment, isNull);
    });
  });
}
