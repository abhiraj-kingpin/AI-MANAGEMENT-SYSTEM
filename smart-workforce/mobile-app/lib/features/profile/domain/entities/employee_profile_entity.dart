class EmployeeProfileEntity {
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String designation;
  final String departmentName;
  final String employmentStatus;
  final DateTime dateOfJoining;
  final String phone;
  final String? email;
  final String? managerName;

  const EmployeeProfileEntity({
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    required this.designation,
    required this.departmentName,
    required this.employmentStatus,
    required this.dateOfJoining,
    required this.phone,
    this.email,
    this.managerName,
  });

  String get fullName => '$firstName $lastName';
}
