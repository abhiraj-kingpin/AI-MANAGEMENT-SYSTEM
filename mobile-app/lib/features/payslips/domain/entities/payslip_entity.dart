/// Mirrors `PayslipDTO` (backend/src/modules/payroll/payslip.types.ts) —
/// the self-service fields only; `employee` never appears on
/// `/payslips/me`, which is all this app ever calls (there's no HR queue
/// here). `/payslips/me` only ever returns `released` payslips, so
/// `status` is always that value in practice, but the field is kept for
/// fidelity with the real DTO rather than hardcoded away.
class PayslipEntity {
  final String id;
  final String month; // "YYYY-MM"
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
