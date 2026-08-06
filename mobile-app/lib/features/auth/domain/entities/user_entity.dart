class UserEntity {
  final String id;
  final String email;
  final String role; // super_admin | hr | manager | employee

  const UserEntity({
    required this.id,
    required this.email,
    required this.role,
  });
}
