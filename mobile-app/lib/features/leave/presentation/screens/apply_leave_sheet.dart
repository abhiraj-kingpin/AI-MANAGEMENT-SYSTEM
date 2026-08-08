import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

final _dateFormat = DateFormat.yMMMd();

/// A modal bottom sheet rather than a separate route — this form is short
/// enough (4 fields) that pushing a whole new screen for it would be more
/// navigation than the task warrants.
class ApplyLeaveSheet extends ConsumerStatefulWidget {
  final List<LeaveTypeEntity> leaveTypes;
  const ApplyLeaveSheet({required this.leaveTypes, super.key});

  @override
  ConsumerState<ApplyLeaveSheet> createState() => _ApplyLeaveSheetState();
}

class _ApplyLeaveSheetState extends ConsumerState<ApplyLeaveSheet> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  String? _leaveTypeId;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  String? _errorMessage;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.leaveTypes.isNotEmpty) _leaveTypeId = widget.leaveTypes.first.id;
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = isStart ? _startDate : _endDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
        if (_endDate.isBefore(_startDate)) _endDate = _startDate;
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _leaveTypeId == null) return;
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final success = await ref.read(leaveControllerProvider.notifier).applyLeave(
          leaveTypeId: _leaveTypeId!,
          startDate: _startDate,
          endDate: _endDate,
          reason: _reasonController.text.trim(),
        );

    if (!mounted) return;
    if (success) {
      Navigator.of(context).pop();
    } else {
      setState(() {
        _isSubmitting = false;
        _errorMessage = ref.read(leaveControllerProvider).errorMessage;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Apply for Leave', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _leaveTypeId,
              decoration: const InputDecoration(labelText: 'Leave Type'),
              items: widget.leaveTypes
                  .map((type) => DropdownMenuItem(value: type.id, child: Text(type.name)))
                  .toList(),
              onChanged: (value) => setState(() => _leaveTypeId = value),
              validator: (value) => value == null ? 'Select a leave type' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'Start Date',
                    value: _startDate,
                    onTap: () => _pickDate(isStart: true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateField(
                    label: 'End Date',
                    value: _endDate,
                    onTap: () => _pickDate(isStart: false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'Reason'),
              maxLines: 2,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'A reason is required' : null,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 20),
            PrimaryButton(label: 'Submit Request', isLoading: _isSubmitting, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final DateTime value;
  final VoidCallback onTap;

  const _DateField({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(_dateFormat.format(value)),
      ),
    );
  }
}
