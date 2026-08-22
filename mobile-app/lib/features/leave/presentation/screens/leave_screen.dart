import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/features/leave/presentation/screens/apply_leave_sheet.dart';

final _dateFormat = DateFormat.MMMd();

const _statusColors = {
  'pending': Colors.amber,
  'approved': Colors.green,
  'rejected': Colors.red,
  'cancelled': Colors.grey,
};

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
            if (!state.isLoading && state.leaveTypes.isEmpty) ...[
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    "No leave types are configured yet, so there's nothing to "
                    'apply for. Ask HR to set these up first.',
                  ),
                ),
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
                                  style:
                                      Theme.of(context).textTheme.labelMedium,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${balance.remaining}',
                                  style:
                                      Theme.of(context).textTheme.headlineSmall,
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
                  onCancel: leave.isCancellable
                      ? () => controller.cancelLeave(leave.id)
                      : null,
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
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    leave.leaveTypeName ?? 'Leave',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                _StatusBadge(status: leave.status),
              ],
            ),
            const SizedBox(height: 4),
            Text('$dateRange · ${leave.totalDays} day(s)'),
            const SizedBox(height: 2),
            Text(leave.reason, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(
              'Applied ${_dateFormat.format(leave.createdAt)}',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: Theme.of(context).colorScheme.outline),
            ),
            if (leave.status == 'rejected' &&
                leave.managerComment != null &&
                leave.managerComment!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'Reason: ${leave.managerComment}',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (onCancel != null) ...[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(onPressed: onCancel, child: const Text('Cancel')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _statusColors[status] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status[0].toUpperCase() + status.substring(1),
        style: TextStyle(
          color: color.shade900,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
