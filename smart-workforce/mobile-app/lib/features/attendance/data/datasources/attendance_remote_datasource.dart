import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/attendance/data/models/attendance_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<AttendanceModel> checkInWithGps({
    required double lat,
    required double lng,
    double? accuracyMeters,
  });

  Future<AttendanceModel> checkInWithQr({required String qrToken});

  Future<AttendanceModel> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
    required double lat,
    required double lng,
    double? accuracyMeters,
  });

  Future<AttendanceModel> checkOut({double? lat, double? lng, double? accuracyMeters});

  Future<AttendanceModel> breakStart();

  Future<AttendanceModel> breakEnd();

  Future<List<AttendanceModel>> getMyAttendance();
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final Dio _dio;
  const AttendanceRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<AttendanceModel> checkInWithGps({
    required double lat,
    required double lng,
    double? accuracyMeters,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.checkIn,
        data: {
          'method': 'gps',
          'location': {
            'lat': lat,
            'lng': lng,
            if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
          },
        },
      );
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AttendanceModel> checkInWithQr({required String qrToken}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.checkIn,
        data: {'method': 'qr', 'qrToken': qrToken},
      );
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AttendanceModel> checkInWithFace({
    required List<double> embedding,
    required bool livenessPassed,
    required double lat,
    required double lng,
    double? accuracyMeters,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.checkIn,
        data: {
          'method': 'face',
          'faceEmbedding': embedding,
          'livenessPassed': livenessPassed,
          'location': {
            'lat': lat,
            'lng': lng,
            if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
          },
        },
      );
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AttendanceModel> checkOut({double? lat, double? lng, double? accuracyMeters}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.checkOut,
        data: {
          if (lat != null && lng != null)
            'location': {
              'lat': lat,
              'lng': lng,
              if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
            },
        },
      );
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AttendanceModel> breakStart() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.breakStart);
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<AttendanceModel> breakEnd() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.breakEnd);
      return _parseAttendance(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<List<AttendanceModel>> getMyAttendance() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.myAttendance);
      final data = response.data?['data'] as List<dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed attendance history response from server.');
      }
      return data
          .map((item) => AttendanceModel.fromJson(item as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  AttendanceModel _parseAttendance(Map<String, dynamic>? body) {
    final data = body?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw const ServerException('Malformed attendance response from server.');
    }
    return AttendanceModel.fromJson(data);
  }
}
