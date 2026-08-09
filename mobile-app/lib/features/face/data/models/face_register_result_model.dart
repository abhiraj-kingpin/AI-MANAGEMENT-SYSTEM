import 'package:ai_management_system/features/face/domain/entities/face_register_result_entity.dart';

class FaceRegisterResultModel extends FaceRegisterResultEntity {
  const FaceRegisterResultModel({
    required super.status,
    required super.embeddingCount,
    required super.discardedCount,
  });

  factory FaceRegisterResultModel.fromJson(Map<String, dynamic> json) {
    return FaceRegisterResultModel(
      status: json['status'] as String,
      embeddingCount: json['embeddingCount'] as int,
      discardedCount: json['discardedCount'] as int,
    );
  }
}
