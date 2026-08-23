import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';

abstract class PayslipRepository {
  Future<Result<List<PayslipEntity>>> getMyPayslips();

  Future<Result<String>> downloadPayslipPdf({required String id, required String month});
}
