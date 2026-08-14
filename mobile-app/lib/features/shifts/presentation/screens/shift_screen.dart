import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/shifts/domain/entities/shift_assignment_entity.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_providers.dart';

class ShiftScreen extends ConsumerWidget {
  const ShiftScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(shiftControllerProvider);
    final controller = ref.read(shiftControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('My Shift')),
      body: RefreshIndicator(
        onRefresh: controller.load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (state.isLoading && state.assignment == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 64),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.errorMessage != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Text(
                  state.errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              )
            else if (state.assignment == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 64),
                child: Center(
                  child: Text(
                    'No shift is currently assigned to you.\n'
                    'Your working hours default to the standard schedule.',
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else
              _ShiftCard(assignment: state.assignment!),
          ],
        ),
      ),
    );
  }
}

class _ShiftCard extends StatelessWidget {
  final ShiftAssignmentEntity assignment;
  const _ShiftCard({required this.assignment});

  @override
  Widget build(BuildContext context) {
    final shift = assignment.shift;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(shift.name, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              _capitalize(shift.type),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const Divider(height: 32),
            _InfoRow(icon: Icons.schedule_outlined, label: '${shift.startTime} – ${shift.endTime}'),
            const SizedBox(height: 12),
            _InfoRow(
              icon: Icons.timer_outlined,
              label: '${shift.gracePeriodMinutes} min grace period',
            ),
            const SizedBox(height: 12),
            _InfoRow(
              icon: Icons.event_outlined,
              label: assignment.effectiveTo != null
                  ? 'Effective ${_formatDate(assignment.effectiveFrom)} – ${_formatDate(assignment.effectiveTo!)}'
                  : 'Effective from ${_formatDate(assignment.effectiveFrom)}',
            ),
          ],
        ),
      ),
    );
  }

  String _capitalize(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

  String _formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoRow({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
      ],
    );
  }
}
