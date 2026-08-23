import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/features/payslips/domain/usecases/download_payslip_pdf_usecase.dart';
import 'package:ai_management_system/features/payslips/domain/usecases/get_my_payslips_usecase.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_state.dart';

class PayslipController extends StateNotifier<PayslipState> {
  final GetMyPayslipsUseCase _getMyPayslipsUseCase;
  final DownloadPayslipPdfUseCase _downloadPayslipPdfUseCase;

  PayslipController({
    required GetMyPayslipsUseCase getMyPayslipsUseCase,
    required DownloadPayslipPdfUseCase downloadPayslipPdfUseCase,
  })  : _getMyPayslipsUseCase = getMyPayslipsUseCase,
        _downloadPayslipPdfUseCase = downloadPayslipPdfUseCase,
        super(const PayslipState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _getMyPayslipsUseCase();
    result.when(
      success: (payslips) => state = state.copyWith(isLoading: false, payslips: payslips),
      failure: (failure) =>
          state = state.copyWith(isLoading: false, errorMessage: failure.message),
    );
  }

  Future<void> download({required String id, required String month}) async {
    state = state.copyWith(downloadingId: id, errorMessage: null, lastDownloadedPath: null);
    final result = await _downloadPayslipPdfUseCase(id: id, month: month);
    result.when(
      success: (path) {
        state = state.copyWith(clearDownloadingId: true, lastDownloadedPath: path);
      },
      failure: (failure) {
        state = state.copyWith(clearDownloadingId: true, errorMessage: failure.message);
      },
    );
  }
}
