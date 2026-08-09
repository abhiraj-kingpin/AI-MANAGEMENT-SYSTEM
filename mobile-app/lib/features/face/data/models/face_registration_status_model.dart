import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';

class FaceRegistrationStatusModel extends FaceRegistrationStatusEntity {
  const FaceRegistrationStatusModel({
    required super.status,
    required super.embeddingCount,
    super.lastRegisteredAt,
  });

  factory FaceRegistrationStatusModel.fromJson(Map<String, dynamic> json) {
    return FaceRegistrationStatusModel(
      status: json['status'] as String,
      embeddingCount: json['embeddingCount'] as int,
      lastRegisteredAt: json['lastRegisteredAt'] != null
          ? DateTime.parse(json['lastRegisteredAt'] as String)
          : null,
    );
  }
}
