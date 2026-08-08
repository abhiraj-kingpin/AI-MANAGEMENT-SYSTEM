import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';

LeaveEntity _fakeLeave({required String status, DateTime? startDate}) {
  return LeaveEntity(
    id: 'l1',
    leaveTypeId: 'lt1',
    leaveTypeName: 'Casual Leave',
    startDate: startDate ?? DateTime.now(),
    endDate: startDate ?? DateTime.now(),
    totalDays: 1,
    reason: 'Personal',
    status: status,
    createdAt: DateTime.now(),
  );
}

void main() {
  group('LeaveEntity.isCancellable', () {
    test('a pending request is always cancellable', () {
      final leave = _fakeLeave(status: 'pending', startDate: DateTime(2020));
      expect(leave.isCancellable, isTrue);
    });

    test('an approved request is cancellable only if it has not started yet', () {
      final future = _fakeLeave(
        status: 'approved',
        startDate: DateTime.now().add(const Duration(days: 5)),
      );
      final past = _fakeLeave(
        status: 'approved',
        startDate: DateTime.now().subtract(const Duration(days: 5)),
      );

      expect(future.isCancellable, isTrue);
      expect(past.isCancellable, isFalse);
    });

    test('a rejected or cancelled request is never cancellable', () {
      expect(_fakeLeave(status: 'rejected').isCancellable, isFalse);
      expect(_fakeLeave(status: 'cancelled').isCancellable, isFalse);
    });
  });
}
