class PayslipEntity {
  final String id;
  final String month;
  final double grossPay;
  final double netPay;
  final double latePenalty;
  final double overtimePay;
  final double bonus;
  final String status;

  const PayslipEntity({
    required this.id,
    required this.month,
    required this.grossPay,
    required this.netPay,
    required this.latePenalty,
    required this.overtimePay,
    required this.bonus,
    required this.status,
  });
}
