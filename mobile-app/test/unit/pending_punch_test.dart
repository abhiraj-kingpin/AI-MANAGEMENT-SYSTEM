import 'package:flutter_test/flutter_test.dart';
import 'package:ai_management_system/core/offline/pending_punch.dart';

void main() {
  group('PendingPunch.toJson / fromJson', () {
    test('round-trips a check-in punch with a location', () {
      final punch = PendingPunch(
        clientGeneratedId: 'device-123',
        type: 'check_in',
        method: 'gps',
        lat: 12.9716,
        lng: 77.5946,
        accuracyMeters: 8.5,
        occurredAt: DateTime.utc(2026, 8, 9, 9, 30),
      );

      final restored = PendingPunch.fromJson(punch.toJson());

      expect(restored.clientGeneratedId, punch.clientGeneratedId);
      expect(restored.type, 'check_in');
      expect(restored.method, 'gps');
      expect(restored.lat, 12.9716);
      expect(restored.lng, 77.5946);
      expect(restored.accuracyMeters, 8.5);
      expect(restored.occurredAt, punch.occurredAt);
    });

    test('a check-out punch with no location omits the location key entirely', () {
      final punch = PendingPunch(
        clientGeneratedId: 'device-456',
        type: 'check_out',
        occurredAt: DateTime.utc(2026, 8, 9, 18, 0),
      );

      final json = punch.toJson();

      expect(json.containsKey('location'), isFalse);
      expect(json.containsKey('method'), isFalse);

      final restored = PendingPunch.fromJson(json);
      expect(restored.lat, isNull);
      expect(restored.lng, isNull);
    });

    test('round-trips a face check-in punch with an embedding', () {
      final punch = PendingPunch(
        clientGeneratedId: 'device-face-1',
        type: 'check_in',
        method: 'face',
        faceEmbedding: List<double>.generate(67, (i) => i / 67),
        livenessPassed: true,
        occurredAt: DateTime.utc(2026, 8, 9, 9, 0),
      );

      final restored = PendingPunch.fromJson(punch.toJson());

      expect(restored.method, 'face');
      expect(restored.faceEmbedding, punch.faceEmbedding);
      expect(restored.livenessPassed, isTrue);
      expect(restored.lat, isNull);
    });

    test('round-trips a QR check-in punch with a token', () {
      final punch = PendingPunch(
        clientGeneratedId: 'device-qr-1',
        type: 'check_in',
        method: 'qr',
        qrToken: 'eyJhbGciOiJIUzI1NiJ9.scanned-token',
        occurredAt: DateTime.utc(2026, 8, 9, 9, 15),
      );

      final restored = PendingPunch.fromJson(punch.toJson());

      expect(restored.method, 'qr');
      expect(restored.qrToken, punch.qrToken);
      expect(restored.lat, isNull);
      expect(restored.faceEmbedding, isNull);
    });

    test('toSyncPayload matches toJson (same wire shape today)', () {
      final punch = PendingPunch(
        clientGeneratedId: 'device-789',
        type: 'check_in',
        method: 'gps',
        lat: 1,
        lng: 2,
        occurredAt: DateTime.utc(2026, 1, 1),
      );

      expect(punch.toSyncPayload(), punch.toJson());
    });
  });
}
