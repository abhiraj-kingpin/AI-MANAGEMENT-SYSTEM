import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/features/leave/presentation/screens/apply_leave_sheet.dart';

final _dateFormat = DateFormat.MMMd();

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(leaveControllerProvider);
    final controller = ref.read(leaveControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Leave')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: state.leaveTypes.isEmpty
            ? null
            : () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => ApplyLeaveSheet(leaveTypes: state.leaveTypes),
                ),
        icon: const Icon(Icons.add),
        label: const Text('Apply'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (state.errorMessage != null) ...[
              Text(
                state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 16),
            ],
            if (state.balances.isNotEmpty) ...[
              Text('Balance', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: state.balances
                    .map(
                      (balance) => SizedBox(
                        width: 150,
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  balance.leaveTypeName,
                                  style: Theme.of(context).textTheme.labelMedium,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${balance.remaining}',
                                  style: Theme.of(context).textTheme.headlineSmall,
                                ),
                                Text(
                                  'of ${balance.allocated + balance.carriedForward} left',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 24),
            ],
            Text('My Requests', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            if (state.isLoading && state.leaves.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.leaves.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: Text('No leave requests yet.')),
              )
            else
              ...state.leaves.map(
                (leave) => _LeaveTile(
                  leave: leave,
                  onCancel: leave.isCancellable ? () => controller.cancelLeave(leave.id) : null,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LeaveTile extends StatelessWidget {
  final LeaveEntity leave;
  final VoidCallback? onCancel;

  const _LeaveTile({required this.leave, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final sameDay = leave.startDate.year == leave.endDate.year &&
        leave.startDate.month == leave.endDate.month &&
        leave.startDate.day == leave.endDate.day;
    final dateRange = sameDay
        ? _dateFormat.format(leave.startDate)
        : '${_dateFormat.format(leave.startDate)} – ${_dateFormat.format(leave.endDate)}';

    return Card(
      child: ListTile(
        title: Text(leave.leaveTypeName ?? 'Leave'),
        subtitle: Text('$dateRange · ${leave.totalDays} day(s)\n${leave.reason}'),
        isThreeLine: true,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(leave.status, style: Theme.of(context).textTheme.labelMedium),
            if (onCancel != null)
              TextButton(onPressed: onCancel, child: const Text('Cancel')),
          ],
        ),
      ),
    );
  }
}
