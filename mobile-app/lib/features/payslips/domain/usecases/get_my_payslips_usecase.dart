import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';
import 'package:ai_management_system/features/payslips/domain/repositories/payslip_repository.dart';

class GetMyPayslipsUseCase {
  final PayslipRepository _repository;
  const GetMyPayslipsUseCase(this._repository);

  Future<Result<List<PayslipEntity>>> call() => _repository.getMyPayslips();
}
