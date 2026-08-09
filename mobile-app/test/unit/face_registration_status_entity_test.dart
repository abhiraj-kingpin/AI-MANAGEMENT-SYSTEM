import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';

void main() {
  group('FaceRegistrationStatusEntity.isRegistered', () {
    test('is true when status is "registered"', () {
      const status = FaceRegistrationStatusEntity(status: 'registered', embeddingCount: 3);
      expect(status.isRegistered, isTrue);
    });

    test('is false when status is "not_registered"', () {
      const status = FaceRegistrationStatusEntity(status: 'not_registered', embeddingCount: 0);
      expect(status.isRegistered, isFalse);
    });
  });
}
