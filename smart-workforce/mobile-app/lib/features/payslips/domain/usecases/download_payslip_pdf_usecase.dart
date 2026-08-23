import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/payslips/domain/repositories/payslip_repository.dart';

class DownloadPayslipPdfUseCase {
  final PayslipRepository _repository;
  const DownloadPayslipPdfUseCase(this._repository);

  Future<Result<String>> call({required String id, required String month}) {
    return _repository.downloadPayslipPdf(id: id, month: month);
  }
}
