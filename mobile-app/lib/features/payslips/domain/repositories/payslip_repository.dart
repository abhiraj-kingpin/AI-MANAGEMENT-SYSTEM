import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';

abstract class PayslipRepository {
  Future<Result<List<PayslipEntity>>> getMyPayslips();

  /// Downloads the PDF and saves it to the device's app-documents
  /// directory, returning the local file path on success.
  Future<Result<String>> downloadPayslipPdf({required String id, required String month});
}
