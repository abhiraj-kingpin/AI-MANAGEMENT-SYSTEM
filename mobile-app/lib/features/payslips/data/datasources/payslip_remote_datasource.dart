import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/payslips/data/models/payslip_model.dart';

abstract class PayslipRemoteDataSource {
  Future<List<PayslipModel>> getMyPayslips();

  /// Returns the raw PDF bytes — `GET /payslips/:id/pdf` is the one binary
  /// response in the whole API, not `ApiSuccess<T>`-shaped like everything
  /// else this app calls.
  Future<List<int>> downloadPayslipPdf(String id);
}

class PayslipRemoteDataSourceImpl implements PayslipRemoteDataSource {
  final Dio _dio;
  const PayslipRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<List<PayslipModel>> getMyPayslips() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.myPayslips);
      final data = response.data?['data'] as List<dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed payslip response from server.');
      }
      return data
          .map((item) => PayslipModel.fromJson(item as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<List<int>> downloadPayslipPdf(String id) async {
    try {
      final response = await _dio.get<List<int>>(
        ApiEndpoints.payslipPdf(id),
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      if (bytes == null) {
        throw const ServerException('Malformed payslip PDF response from server.');
      }
      return bytes;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
