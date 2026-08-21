import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';

enum _DayMark { present, absent, onLeave }

final _monthFormat = DateFormat.yMMMM();

/// A month-grid view of the signed-in employee's own attendance — how many
/// days they were present vs. absent vs. on leave, at a glance, rather than
/// only the flat list `AttendanceScreen`'s "History" section shows. Reuses
/// `AttendanceController`'s already-loaded history (the backend returns the
/// most recent 90 records with no extra query needed — see
/// `attendance.service.ts#getMyAttendance`) instead of a new endpoint.
///
/// A day with no record at all (not in `history`) is left unmarked rather
/// than assumed absent — the client has no visibility here into which days
/// were weekends, holidays, or before this employee's join date, and
/// guessing would fabricate a status the backend never actually computed.
/// Every colored day below reflects a real `AttendanceEntity` the server
/// returned.
class AttendanceCalendarScreen extends ConsumerStatefulWidget {
  const AttendanceCalendarScreen({super.key});

  @override
  ConsumerState<AttendanceCalendarScreen> createState() =>
      _AttendanceCalendarScreenState();
}

class _AttendanceCalendarScreenState
    extends ConsumerState<AttendanceCalendarScreen> {
  late DateTime _shownMonth;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _shownMonth = DateTime(now.year, now.month);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceControllerProvider);
    final byDay = _indexByDay(state.history);

    final daysInMonth =
        DateTime(_shownMonth.year, _shownMonth.month + 1, 0).day;
    // DateTime.weekday: Monday=1..Sunday=7 — this grid starts on Sunday, so
    // a Sunday-first (weekday % 7) offset is how many blank leading cells
    // the 1st of the month needs.
    final leadingBlanks =
        DateTime(_shownMonth.year, _shownMonth.month, 1).weekday % 7;

    final counts = _monthCounts(byDay, _shownMonth, daysInMonth);

    return Scaffold(
      appBar: AppBar(title: const Text('Attendance Calendar')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () => setState(
                  () => _shownMonth =
                      DateTime(_shownMonth.year, _shownMonth.month - 1),
                ),
              ),
              Expanded(
                child: Text(
                  _monthFormat.format(_shownMonth),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                // Can't navigate past the current month — there's nothing
                // real to show yet for a month that hasn't happened.
                onPressed: _isCurrentOrFutureMonth(_shownMonth)
                    ? null
                    : () => setState(
                          () => _shownMonth =
                              DateTime(_shownMonth.year, _shownMonth.month + 1),
                        ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _CountChip(
                  label: 'Present',
                  count: counts[_DayMark.present]!,
                  color: Colors.green),
              _CountChip(
                  label: 'Absent',
                  count: counts[_DayMark.absent]!,
                  color: Colors.red),
              _CountChip(
                label: 'On leave',
                count: counts[_DayMark.onLeave]!,
                color: Colors.blueGrey,
              ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (final label in const ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
                Center(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline),
                  ),
                ),
              for (var i = 0; i < leadingBlanks; i++) const SizedBox.shrink(),
              for (var day = 1; day <= daysInMonth; day++)
                _DayCell(
                  day: day,
                  mark:
                      byDay[DateTime(_shownMonth.year, _shownMonth.month, day)],
                  isToday: _isSameDay(
                    DateTime(_shownMonth.year, _shownMonth.month, day),
                    DateTime.now(),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (state.isLoading && state.history.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  bool _isCurrentOrFutureMonth(DateTime month) {
    final now = DateTime.now();
    return month.year > now.year ||
        (month.year == now.year && month.month >= now.month);
  }

  Map<DateTime, _DayMark> _indexByDay(List<AttendanceEntity> history) {
    final map = <DateTime, _DayMark>{};
    for (final record in history) {
      final day =
          DateTime(record.date.year, record.date.month, record.date.day);
      map[day] = switch (record.status) {
        'absent' => _DayMark.absent,
        'on_leave' => _DayMark.onLeave,
        // 'present' / 'late' / 'half_day' all mean "showed up that day" —
        // this view isn't the place to relitigate punctuality (see
        // AttendanceScreen's history tile, which dropped that label for
        // the same reason).
        _ => _DayMark.present,
      };
    }
    return map;
  }

  Map<_DayMark, int> _monthCounts(
    Map<DateTime, _DayMark> byDay,
    DateTime month,
    int daysInMonth,
  ) {
    final counts = {for (final mark in _DayMark.values) mark: 0};
    for (var day = 1; day <= daysInMonth; day++) {
      final mark = byDay[DateTime(month.year, month.month, day)];
      if (mark != null) counts[mark] = counts[mark]! + 1;
    }
    return counts;
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _CountChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _CountChip(
      {required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count',
            style:
                Theme.of(context).textTheme.titleLarge?.copyWith(color: color)),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  final int day;
  final _DayMark? mark;
  final bool isToday;
  const _DayCell(
      {required this.day, required this.mark, required this.isToday});

  @override
  Widget build(BuildContext context) {
    final color = switch (mark) {
      _DayMark.present => Colors.green,
      _DayMark.absent => Colors.red,
      _DayMark.onLeave => Colors.blueGrey,
      null => null,
    };

    return Padding(
      padding: const EdgeInsets.all(3),
      child: Container(
        decoration: BoxDecoration(
          color: color?.withValues(alpha: 0.18),
          shape: BoxShape.circle,
          border: isToday
              ? Border.all(
                  color: Theme.of(context).colorScheme.primary, width: 1.5)
              : null,
        ),
        child: Center(
          child: Text(
            '$day',
            style: TextStyle(
              color: color != null ? color.withValues(alpha: 1) : null,
              fontWeight: color != null ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}
