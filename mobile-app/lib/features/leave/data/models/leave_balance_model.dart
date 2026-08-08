import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';

class LeaveBalanceModel extends LeaveBalanceEntity {
  const LeaveBalanceModel({
    required super.leaveTypeId,
    required super.leaveTypeName,
    required super.year,
    required super.allocated,
    required super.used,
    required super.carriedForward,
    required super.remaining,
  });

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceModel(
      leaveTypeId: json['leaveTypeId'] as String,
      leaveTypeName: json['leaveTypeName'] as String,
      year: json['year'] as int,
      allocated: json['allocated'] as num,
      used: json['used'] as num,
      carriedForward: json['carriedForward'] as num,
      remaining: json['remaining'] as num,
    );
  }
}
