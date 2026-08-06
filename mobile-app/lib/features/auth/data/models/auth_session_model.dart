import 'package:ai_management_system/features/auth/data/models/user_model.dart';
import 'package:ai_management_system/features/auth/domain/entities/auth_session_entity.dart';

class AuthSessionModel extends AuthSessionEntity {
  const AuthSessionModel({
    required super.accessToken,
    required super.refreshToken,
    required super.user,
  });

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) => AuthSessionModel(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      );
}
