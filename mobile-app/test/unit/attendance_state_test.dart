import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_state.dart';

AttendanceEntity _fakeAttendance({DateTime? date, DateTime? checkOutAt}) {
  return AttendanceEntity(
    id: 'a1',
    date: date ?? DateTime.now(),
    checkInAt: DateTime.now(),
    checkOutAt: checkOutAt,
    method: 'gps',
    workingMinutes: 0,
    status: 'present',
    isOvertime: false,
    overtimeMinutes: 0,
  );
}

void main() {
  group('AttendanceState.copyWith', () {
    test('defaults to loading with no history', () {
      const state = AttendanceState();

      expect(state.isLoading, isTrue);
      expect(state.today, isNull);
      expect(state.history, isEmpty);
    });

    test('preserves unspecified fields and overrides only what is passed', () {
      final today = _fakeAttendance();
      final initial = AttendanceState(isLoading: false, today: today, history: [today]);

      final updated = initial.copyWith(isActionInProgress: true);

      expect(updated.isActionInProgress, isTrue);
      expect(updated.isLoading, isFalse);
      expect(updated.today, same(today));
      expect(updated.history, [today]);
    });
  });

  group('AttendanceEntity.isSameDayAs / isCheckedIn', () {
    test('isSameDayAs matches calendar date regardless of time-of-day', () {
      final record = _fakeAttendance(date: DateTime(2026, 8, 9, 0, 0));

      expect(record.isSameDayAs(DateTime(2026, 8, 9, 23, 59)), isTrue);
      expect(record.isSameDayAs(DateTime(2026, 8, 10)), isFalse);
    });

    test('isCheckedIn is true only between check-in and check-out', () {
      final checkedIn = _fakeAttendance();
      final checkedOut = _fakeAttendance(checkOutAt: DateTime.now());

      expect(checkedIn.isCheckedIn, isTrue);
      expect(checkedOut.isCheckedIn, isFalse);
    });
  });
}
