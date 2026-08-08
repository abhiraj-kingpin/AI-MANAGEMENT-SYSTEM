import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';

class PayslipState {
  final bool isLoading;
  final String? downloadingId;
  final List<PayslipEntity> payslips;
  final String? errorMessage;
  final String? lastDownloadedPath;

  const PayslipState({
    this.isLoading = true,
    this.downloadingId,
    this.payslips = const [],
    this.errorMessage,
    this.lastDownloadedPath,
  });

  PayslipState copyWith({
    bool? isLoading,
    String? downloadingId,
    bool clearDownloadingId = false,
    List<PayslipEntity>? payslips,
    String? errorMessage,
    String? lastDownloadedPath,
  }) {
    return PayslipState(
      isLoading: isLoading ?? this.isLoading,
      downloadingId: clearDownloadingId ? null : (downloadingId ?? this.downloadingId),
      payslips: payslips ?? this.payslips,
      errorMessage: errorMessage,
      lastDownloadedPath: lastDownloadedPath,
    );
  }
}
