import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_type_entity.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/shared/widgets/primary_button.dart';

final _dateFormat = DateFormat.yMMMd();
const _maxReasonLength = 500;

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
  DateTimeRange? _range;
  bool _reviewing = false;
  String? _errorMessage;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.leaveTypes.isNotEmpty) _leaveTypeId = widget.leaveTypes.first.id;
    _reasonController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  String? get _leaveTypeName {
    if (_leaveTypeId == null) return null;
    for (final type in widget.leaveTypes) {
      if (type.id == _leaveTypeId) return type.name;
    }
    return null;
  }

  int get _totalDays {
    if (_range == null) return 0;
    return _range!.end.difference(_range!.start).inDays + 1;
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      initialDateRange: _range,
      helpText: 'Select leave dates',
      saveText: 'Select',
    );
    if (picked == null) return;
    setState(() => _range = picked);
  }

  void _clearRange() => setState(() => _range = null);

  void _goToReview() {
    if (!_formKey.currentState!.validate()) return;
    if (_range == null) {
      setState(() => _errorMessage = 'Select a date range for your leave.');
      return;
    }
    setState(() {
      _errorMessage = null;
      _reviewing = true;
    });
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final success = await ref.read(leaveControllerProvider.notifier).applyLeave(
          leaveTypeId: _leaveTypeId!,
          startDate: _range!.start,
          endDate: _range!.end,
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
      child: _reviewing ? _buildReview(context) : _buildForm(context),
    );
  }

  Widget _buildForm(BuildContext context) {
    final reasonLength = _reasonController.text.length;
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Apply for Leave', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _leaveTypeId,
            decoration: const InputDecoration(labelText: 'Leave Type'),
            items: widget.leaveTypes
                .map((type) => DropdownMenuItem(value: type.id, child: Text(type.name)))
                .toList(),
            onChanged: (value) => setState(() => _leaveTypeId = value),
            validator: (value) => value == null ? 'Select a leave type' : null,
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pickRange,
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'Dates',
                suffixIcon: _range != null
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        tooltip: 'Clear selection',
                        onPressed: _clearRange,
                      )
                    : const Icon(Icons.calendar_month_outlined),
              ),
              child: Text(
                _range == null
                    ? 'Tap to choose from/to dates'
                    : '${_dateFormat.format(_range!.start)} → ${_dateFormat.format(_range!.end)}'
                        ' ($_totalDays day${_totalDays == 1 ? '' : 's'})',
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _reasonController,
            decoration: InputDecoration(
              labelText: 'Reason for Leave',
              hintText: 'Please enter the reason for your leave…',
              counterText: '$reasonLength/$_maxReasonLength',
            ),
            maxLines: 3,
            maxLength: _maxReasonLength,
            validator: (value) =>
                (value == null || value.trim().isEmpty) ? 'A reason is required' : null,
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          PrimaryButton(label: 'Review Request', onPressed: _goToReview),
        ],
      ),
    );
  }

  Widget _buildReview(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Confirm Leave Request', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SummaryRow(label: 'Leave Type', value: _leaveTypeName ?? '—'),
                _SummaryRow(label: 'From', value: _dateFormat.format(_range!.start)),
                _SummaryRow(label: 'To', value: _dateFormat.format(_range!.end)),
                _SummaryRow(label: 'Total Days', value: '$_totalDays'),
                const SizedBox(height: 8),
                Text('Reason', style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 4),
                Text(_reasonController.text.trim()),
              ],
            ),
          ),
        ),
        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _isSubmitting ? null : () => setState(() => _reviewing = false),
                child: const Text('Edit'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PrimaryButton(
                label: 'Submit',
                isLoading: _isSubmitting,
                onPressed: _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
