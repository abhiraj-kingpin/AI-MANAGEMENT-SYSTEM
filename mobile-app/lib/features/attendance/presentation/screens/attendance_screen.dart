import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

final _timeFormat = DateFormat.jm();
final _dateFormat = DateFormat.MMMd();
final _dayDateTimeFormat = DateFormat('EEEE, MMMM d \'at\' h:mm a');

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(attendanceControllerProvider);
    final controller = ref.read(attendanceControllerProvider.notifier);
    final today = state.today;
    final hasCheckedInToday =
        today != null && today.isSameDayAs(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'Attendance calendar',
            onPressed: () => context.push(attendanceCalendarPath),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.loadHistory,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _statusLine(hasCheckedInToday ? today : null),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    if (hasCheckedInToday && today.checkOutAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Worked ${_formatMinutes(today.workingMinutes)}'
                        '${today.isOvertime ? ' (+${_formatMinutes(today.overtimeMinutes)} overtime)' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (state.errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        state.errorMessage!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    if (state.infoMessage != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.cloud_off, size: 16),
                          const SizedBox(width: 6),
                          Expanded(child: Text(state.infoMessage!)),
                        ],
                      ),
                    ],
                    const SizedBox(height: 20),
                    if (!hasCheckedInToday || today.checkInAt == null) ...[
                      PrimaryButton(
                        label: 'Check In with GPS',
                        isLoading: state.isActionInProgress,
                        onPressed: controller.checkIn,
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.qr_code_scanner_outlined),
                        label: const Text('Check In with QR'),
                        onPressed: state.isActionInProgress
                            ? null
                            : () => context.push(qrCheckInPath),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.face_outlined),
                        label: const Text('Check In with Face'),
                        onPressed: state.isActionInProgress
                            ? null
                            : () => context.push(faceCheckInPath),
                      ),
                    ] else if (today.checkOutAt == null) ...[
                      if (today.hasOpenBreak) ...[
                        Text(
                          'On break since ${_timeFormat.format(today.breaks.lastWhere((b) => b.isOpen).start.toLocal())}',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 10),
                        PrimaryButton(
                          label: 'End Break',
                          isLoading: state.isActionInProgress,
                          onPressed: controller.breakEnd,
                        ),
                      ] else ...[
                        PrimaryButton(
                          label: 'Check Out',
                          isLoading: state.isActionInProgress,
                          onPressed: controller.checkOut,
                        ),
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.free_breakfast_outlined),
                          label: const Text('Start Break'),
                          onPressed: state.isActionInProgress
                              ? null
                              : controller.breakStart,
                        ),
                      ],
                      if (today.breaks.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text('Today\'s breaks',
                            style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 4),
                        for (final b in today.breaks)
                          Text(
                            b.end != null
                                ? '${_timeFormat.format(b.start.toLocal())} – ${_timeFormat.format(b.end!.toLocal())}'
                                : '${_timeFormat.format(b.start.toLocal())} – ongoing',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ] else
                      const Text(
                        'You\'re done for today.',
                        textAlign: TextAlign.center,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('History', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            if (state.isLoading && state.history.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.history.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: Text('No attendance records yet.')),
              )
            else
              ...state.history.map((record) => _HistoryTile(record: record)),
          ],
        ),
      ),
    );
  }

  String _statusLine(AttendanceEntity? today) {
    if (today == null || today.checkInAt == null) return 'Not checked in yet';
    if (today.checkOutAt == null) {
      return 'Checked in ${_dayDateTimeFormat.format(today.checkInAt!.toLocal())}';
    }
    return 'Checked out ${_dayDateTimeFormat.format(today.checkOutAt!.toLocal())}';
  }

  String _formatMinutes(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    return '${hours}h ${mins}m';
  }
}

class _HistoryTile extends StatelessWidget {
  final AttendanceEntity record;
  const _HistoryTile({required this.record});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(_dateFormat.format(record.date.toLocal())),
      subtitle: Text(
        record.checkInAt == null
            ? 'No check-in'
            : record.checkOutAt == null
                ? 'In: ${_timeFormat.format(record.checkInAt!.toLocal())}'
                : '${_timeFormat.format(record.checkInAt!.toLocal())} – '
                    '${_timeFormat.format(record.checkOutAt!.toLocal())}',
      ),
      trailing: record.status == 'on_leave'
          ? Text('on leave', style: Theme.of(context).textTheme.labelMedium)
          : null,
    );
  }
}
