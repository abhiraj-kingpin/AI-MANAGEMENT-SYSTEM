import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/shifts/data/models/shift_assignment_model.dart';

abstract class ShiftRemoteDataSource {
  Future<ShiftAssignmentModel?> getMyShift();
}

class ShiftRemoteDataSourceImpl implements ShiftRemoteDataSource {
  final Dio _dio;
  const ShiftRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<ShiftAssignmentModel?> getMyShift() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.myShift);
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed shift response from server.');
      }
      final assignment = data['assignment'] as Map<String, dynamic>?;
      if (assignment == null) return null;
      return ShiftAssignmentModel.fromJson(assignment);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
