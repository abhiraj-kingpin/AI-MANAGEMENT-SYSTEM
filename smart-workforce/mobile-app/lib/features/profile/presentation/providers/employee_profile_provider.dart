import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/features/profile/domain/entities/employee_profile_entity.dart';

/// The mobile app previously only ever kept {id, email, role} from a
/// login response — never the full employee record (designation,
/// department, join date, etc.) the redesigned Profile tab needs. Fetches
/// it fresh via the same GET /employees/:id the admin dashboard already
/// uses; the backend already scopes this to "your own record" for a
/// plain employee actor.
final employeeProfileProvider = FutureProvider<EmployeeProfileEntity?>((ref) async {
  final employee = ref.watch(authControllerProvider).employee;
  if (employee == null) return null;

  final dio = ref.watch(dioClientProvider).dio;
  final response = await dio.get<Map<String, dynamic>>(
    ApiEndpoints.employeeById(employee.id),
  );
  final data = response.data?['data'] as Map<String, dynamic>?;
  if (data == null) return null;

  final department = data['department'] as Map<String, dynamic>?;
  final manager = data['manager'] as Map<String, dynamic>?;

  return EmployeeProfileEntity(
    employeeCode: data['employeeCode'] as String? ?? employee.employeeCode,
    firstName: data['firstName'] as String? ?? employee.firstName,
    lastName: data['lastName'] as String? ?? employee.lastName,
    designation: data['designation'] as String? ?? '—',
    departmentName: department?['name'] as String? ?? '—',
    employmentStatus: data['employmentStatus'] as String? ?? 'active',
    dateOfJoining: DateTime.tryParse(data['dateOfJoining'] as String? ?? '') ?? DateTime.now(),
    phone: data['phone'] as String? ?? '—',
    email: data['email'] as String?,
    managerName: manager != null ? '${manager['firstName']} ${manager['lastName']}' : null,
  );
});
