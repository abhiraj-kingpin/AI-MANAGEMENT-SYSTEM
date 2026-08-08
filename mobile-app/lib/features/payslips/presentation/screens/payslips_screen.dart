import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_providers.dart';

class PayslipsScreen extends ConsumerWidget {
  const PayslipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(payslipControllerProvider);
    final controller = ref.read(payslipControllerProvider.notifier);

    // One-time side effects (SnackBars) tied to state transitions, rather
    // than rebuilding UI off them — the standard Riverpod pattern for
    // "do something once when X changes" instead of `setState` in a
    // build-time effect.
    ref.listen(payslipControllerProvider, (previous, next) {
      if (next.lastDownloadedPath != null &&
          next.lastDownloadedPath != previous?.lastDownloadedPath) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved to ${next.lastDownloadedPath}')),
        );
      }
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!)),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Payslips')),
      body: RefreshIndicator(
        onRefresh: controller.load,
        child: state.isLoading && state.payslips.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : state.payslips.isEmpty
                ? ListView(
                    children: const [
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 64),
                        child: Center(child: Text('No payslips released yet.')),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: state.payslips.length,
                    itemBuilder: (context, index) {
                      final PayslipEntity payslip = state.payslips[index];
                      final isDownloading = state.downloadingId == payslip.id;
                      return Card(
                        child: ListTile(
                          title: Text(payslip.month),
                          subtitle: Text(
                            'Gross ${_formatAmount(payslip.grossPay)} · '
                            'Net ${_formatAmount(payslip.netPay)}',
                          ),
                          trailing: isDownloading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : IconButton(
                                  icon: const Icon(Icons.download_outlined),
                                  tooltip: 'Download PDF',
                                  onPressed: () => controller.download(
                                    id: payslip.id,
                                    month: payslip.month,
                                  ),
                                ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  String _formatAmount(double amount) => amount.toStringAsFixed(2);
}
