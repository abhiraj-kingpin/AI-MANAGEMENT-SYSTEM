import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/core/services/file_opener_service.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_providers.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _monthYear = DateFormat('MMMM yyyy');

String _formatMonth(String raw) {
  try {
    final parsed = DateFormat('yyyy-MM').parseStrict(raw);
    return _monthYear.format(parsed);
  } catch (_) {
    return raw;
  }
}

String _money(double amount) => '\$${amount.toStringAsFixed(2)}';

class PayslipsScreen extends ConsumerWidget {
  const PayslipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(payslipControllerProvider);
    final controller = ref.read(payslipControllerProvider.notifier);

    ref.listen(payslipControllerProvider, (previous, next) {
      if (next.lastDownloadedPath != null &&
          next.lastDownloadedPath != previous?.lastDownloadedPath) {
        final path = next.lastDownloadedPath!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Saved to $path'),
            action: SnackBarAction(label: 'Open', onPressed: () => _openPayslip(context, ref, path)),
          ),
        );
      }
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(next.errorMessage!)));
      }
    });

    final payslips = state.payslips;
    final latest = payslips.isNotEmpty ? payslips.first : null;
    final previous = payslips.length > 1 ? payslips.sublist(1) : const <PayslipEntity>[];

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.load,
          child: state.isLoading && payslips.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.fromLTRB(18, 20, 18, 132),
                  children: [
                    Text('Payslips', style: WPText.sans(size: 22, weight: FontWeight.w800)),
                    const SizedBox(height: 3),
                    Text('Your pay history and downloadable statements',
                        style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),),
                    const SizedBox(height: 18),
                    if (state.errorMessage != null && payslips.isEmpty) ...[
                      Text(state.errorMessage!, style: WPText.sans(size: 12.5, color: WPColors.danger)),
                      const SizedBox(height: 12),
                    ],
                    if (latest == null)
                      WPCard(
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Text('No payslips released yet.', style: WPText.sans(size: 12.5, color: WPColors.textDim)),
                          ),
                        ),
                      )
                    else ...[
                      _CurrentPayslipCard(
                        payslip: latest,
                        isDownloading: state.downloadingId == latest.id,
                        onDownload: () => controller.download(id: latest.id, month: latest.month),
                      ),
                      if (previous.isNotEmpty) ...[
                        const SizedBox(height: 22),
                        Text('PREVIOUS PAYSLIPS',
                            style: WPText.sans(size: 11, weight: FontWeight.w700, color: WPColors.textDim, letterSpacing: 0.6),),
                        const SizedBox(height: 10),
                        WPCard(
                          padding: EdgeInsets.zero,
                          child: Column(
                            children: [
                              for (int i = 0; i < previous.length; i++)
                                _PayslipRow(
                                  payslip: previous[i],
                                  isLast: i == previous.length - 1,
                                  isDownloading: state.downloadingId == previous[i].id,
                                  onDownload: () => controller.download(id: previous[i].id, month: previous[i].month),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
        ),
      ),
    );
  }

  Future<void> _openPayslip(BuildContext context, WidgetRef ref, String path) async {
    final result = await ref.read(fileOpenerServiceProvider).open(path);
    if (result.outcome == FileOpenOutcome.opened || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_friendlyOpenError(result.outcome))));
  }

  String _friendlyOpenError(FileOpenOutcome outcome) {
    switch (outcome) {
      case FileOpenOutcome.noAppAvailable:
        return 'No app on this device can open a PDF. The file is still saved.';
      case FileOpenOutcome.fileNotFound:
        return 'Could not find the saved file — try downloading it again.';
      case FileOpenOutcome.permissionDenied:
        return 'Permission denied opening the file.';
      case FileOpenOutcome.opened:
      case FileOpenOutcome.failed:
        return 'Could not open the file.';
    }
  }
}

class _CurrentPayslipCard extends StatelessWidget {
  final PayslipEntity payslip;
  final bool isDownloading;
  final VoidCallback onDownload;
  const _CurrentPayslipCard({required this.payslip, required this.isDownloading, required this.onDownload});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: WPColors.dark,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: WPColors.dark.withOpacity(0.28), blurRadius: 22, offset: const Offset(0, 10))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(_formatMonth(payslip.month),
                    style: WPText.sans(size: 13, weight: FontWeight.w700, color: Colors.white.withOpacity(0.65)),),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
                child: Text(payslip.status[0].toUpperCase() + payslip.status.substring(1),
                    style: WPText.sans(size: 10, weight: FontWeight.w700, color: Colors.white),),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text('Net Pay', style: WPText.sans(size: 11.5, weight: FontWeight.w600, color: Colors.white.withOpacity(0.55))),
          const SizedBox(height: 2),
          Text(_money(payslip.netPay), style: WPText.mono(size: 32, weight: FontWeight.w500, color: Colors.white)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(15)),
            child: Column(
              children: [
                _BreakdownRow('Gross pay', _money(payslip.grossPay)),
                if (payslip.overtimePay > 0) _BreakdownRow('Overtime', '+ ${_money(payslip.overtimePay)}', positive: true),
                if (payslip.bonus > 0) _BreakdownRow('Bonus', '+ ${_money(payslip.bonus)}', positive: true),
                if (payslip.latePenalty > 0) _BreakdownRow('Late penalty', '− ${_money(payslip.latePenalty)}', positive: false),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: WPButton(
                  label: 'Download PDF',
                  variant: WPButtonVariant.purple,
                  isLoading: isDownloading,
                  onPressed: onDownload,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BreakdownRow extends StatelessWidget {
  final String label;
  final String value;
  final bool? positive;
  const _BreakdownRow(this.label, this.value, {this.positive});

  @override
  Widget build(BuildContext context) {
    final color = positive == null
        ? Colors.white
        : positive!
            ? const Color(0xFF7FE6BE)
            : const Color(0xFFFF9B9B);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: WPText.sans(size: 12, weight: FontWeight.w500, color: Colors.white.withOpacity(0.7))),
          Text(value, style: WPText.mono(size: 12.5, weight: FontWeight.w500, color: color)),
        ],
      ),
    );
  }
}

class _PayslipRow extends StatelessWidget {
  final PayslipEntity payslip;
  final bool isLast;
  final bool isDownloading;
  final VoidCallback onDownload;
  const _PayslipRow({
    required this.payslip,
    required this.isLast,
    required this.isDownloading,
    required this.onDownload,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: WPColors.borderLight)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: WPColors.accentLight, borderRadius: BorderRadius.circular(12)),
            alignment: Alignment.center,
            child: const Icon(Icons.description_outlined, size: 18, color: WPColors.accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_formatMonth(payslip.month), style: WPText.sans(size: 13, weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text('Net ${_money(payslip.netPay)}',
                    style: WPText.sans(size: 11.5, weight: FontWeight.w500, color: WPColors.textDim),),
              ],
            ),
          ),
          isDownloading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : InkWell(
                  onTap: onDownload,
                  borderRadius: BorderRadius.circular(10),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(Icons.download_outlined, size: 20, color: WPColors.text),
                  ),
                ),
        ],
      ),
    );
  }
}
