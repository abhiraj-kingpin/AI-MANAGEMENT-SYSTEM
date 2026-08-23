class EmployeeSummaryEntity {
  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;

  const EmployeeSummaryEntity({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
  });

  String get fullName => '$firstName $lastName';

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return (f + l).toUpperCase();
  }
}
