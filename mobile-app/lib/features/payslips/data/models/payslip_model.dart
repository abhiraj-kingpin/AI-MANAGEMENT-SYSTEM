import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';

class PayslipModel extends PayslipEntity {
  const PayslipModel({
    required super.id,
    required super.month,
    required super.grossPay,
    required super.netPay,
    required super.latePenalty,
    required super.overtimePay,
    required super.bonus,
    required super.status,
  });

  factory PayslipModel.fromJson(Map<String, dynamic> json) {
    return PayslipModel(
      id: json['id'] as String,
      month: json['month'] as String,
      grossPay: (json['grossPay'] as num).toDouble(),
      netPay: (json['netPay'] as num).toDouble(),
      latePenalty: (json['latePenalty'] as num).toDouble(),
      overtimePay: (json['overtimePay'] as num).toDouble(),
      bonus: (json['bonus'] as num).toDouble(),
      status: json['status'] as String,
    );
  }
}
