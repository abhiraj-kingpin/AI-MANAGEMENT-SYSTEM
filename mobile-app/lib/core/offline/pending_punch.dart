/// One offline-queued check-in/check-out, matching `SyncPunchInput`
/// (backend/src/modules/attendance/attendance.validators.ts's
/// `syncPunchSchema`) field-for-field. Stored in Hive as a plain
/// `Map<String, dynamic>` (via [toJson]/[fromJson]) rather than a custom
/// `HiveObject` subclass with a generated `TypeAdapter` — this project has
/// no `build_runner`/`hive_generator` step, and Hive natively supports
/// storing Maps of primitives without one.
class PendingPunch {
  final String clientGeneratedId;
  final String type; // 'check_in' | 'check_out'
  final String? method; // 'gps' | 'qr' | 'face'
  final double? lat;
  final double? lng;
  final double? accuracyMeters;
  final String? qrToken;
  final List<double>? faceEmbedding;
  final bool? livenessPassed;
  final DateTime occurredAt;

  const PendingPunch({
    required this.clientGeneratedId,
    required this.type,
    required this.occurredAt,
    this.method,
    this.lat,
    this.lng,
    this.accuracyMeters,
    this.qrToken,
    this.faceEmbedding,
    this.livenessPassed,
  });

  Map<String, dynamic> toJson() {
    return {
      'clientGeneratedId': clientGeneratedId,
      'type': type,
      if (method != null) 'method': method,
      if (lat != null && lng != null)
        'location': {
          'lat': lat,
          'lng': lng,
          if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
        },
      if (qrToken != null) 'qrToken': qrToken,
      if (faceEmbedding != null) 'faceEmbedding': faceEmbedding,
      if (livenessPassed != null) 'livenessPassed': livenessPassed,
      'occurredAt': occurredAt.toIso8601String(),
    };
  }

  /// The exact shape `POST /attendance/sync`'s `punches[]` expects — kept
  /// separate from [toJson] (Hive's on-disk shape) even though they're
  /// currently identical, since the sync request body and the local cache
  /// format are conceptually different concerns that happen to coincide
  /// today.
  Map<String, dynamic> toSyncPayload() => toJson();

  factory PendingPunch.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;
    final embedding = json['faceEmbedding'] as List<dynamic>?;
    return PendingPunch(
      clientGeneratedId: json['clientGeneratedId'] as String,
      type: json['type'] as String,
      method: json['method'] as String?,
      lat: (location?['lat'] as num?)?.toDouble(),
      lng: (location?['lng'] as num?)?.toDouble(),
      accuracyMeters: (location?['accuracyMeters'] as num?)?.toDouble(),
      qrToken: json['qrToken'] as String?,
      faceEmbedding: embedding?.map((v) => (v as num).toDouble()).toList(),
      livenessPassed: json['livenessPassed'] as bool?,
      occurredAt: DateTime.parse(json['occurredAt'] as String),
    );
  }
}
