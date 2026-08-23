import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/leave/data/models/leave_balance_model.dart';
import 'package:ai_management_system/features/leave/data/models/leave_model.dart';
import 'package:ai_management_system/features/leave/data/models/leave_type_model.dart';

abstract class LeaveRemoteDataSource {
  Future<List<LeaveTypeModel>> getLeaveTypes();
  Future<List<LeaveBalanceModel>> getMyBalance();
  Future<List<LeaveModel>> getMyLeaves();

  Future<LeaveModel> applyLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  });

  Future<LeaveModel> cancelLeave(String leaveId);
}

class LeaveRemoteDataSourceImpl implements LeaveRemoteDataSource {
  final Dio _dio;
  const LeaveRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<List<LeaveTypeModel>> getLeaveTypes() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.leaveTypes);
      return _parseList(response.data, LeaveTypeModel.fromJson);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<List<LeaveBalanceModel>> getMyBalance() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.myLeaveBalance);
      return _parseList(response.data, LeaveBalanceModel.fromJson);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<List<LeaveModel>> getMyLeaves() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.myLeaves);
      return _parseList(response.data, LeaveModel.fromJson);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<LeaveModel> applyLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.leaves,
        data: {
          'leaveTypeId': leaveTypeId,
          'startDate': startDate.toIso8601String(),
          'endDate': endDate.toIso8601String(),
          'reason': reason,
        },
      );
      return _parseLeave(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<LeaveModel> cancelLeave(String leaveId) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(ApiEndpoints.cancelLeave(leaveId));
      return _parseLeave(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  List<T> _parseList<T>(
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final data = body?['data'] as List<dynamic>?;
    if (data == null) {
      throw const ServerException('Malformed response from server.');
    }
    return data.map((item) => fromJson(item as Map<String, dynamic>)).toList(growable: false);
  }

  LeaveModel _parseLeave(Map<String, dynamic>? body) {
    final data = body?['data'] as Map<String, dynamic>?;
    final leave = data?['leave'] as Map<String, dynamic>?;
    if (leave == null) {
      throw const ServerException('Malformed leave response from server.');
    }
    return LeaveModel.fromJson(leave);
  }
}
