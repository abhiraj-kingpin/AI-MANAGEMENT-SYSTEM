import 'package:ai_management_system/features/auth/domain/entities/employee_summary_entity.dart';

class EmployeeSummaryModel extends EmployeeSummaryEntity {
  const EmployeeSummaryModel({
    required super.id,
    required super.employeeCode,
    required super.firstName,
    required super.lastName,
  });

  factory EmployeeSummaryModel.fromJson(Map<String, dynamic> json) => EmployeeSummaryModel(
        id: json['id'] as String,
        employeeCode: json['employeeCode'] as String,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'employeeCode': employeeCode,
        'firstName': firstName,
        'lastName': lastName,
      };
}
