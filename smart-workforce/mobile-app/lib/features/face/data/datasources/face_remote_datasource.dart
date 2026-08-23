import 'package:dio/dio.dart';
import 'package:ai_management_system/core/constants/api_endpoints.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/network/dio_exception_mapper.dart';
import 'package:ai_management_system/features/face/data/models/face_register_result_model.dart';
import 'package:ai_management_system/features/face/data/models/face_registration_status_model.dart';

abstract class FaceRemoteDataSource {
  Future<FaceRegisterResultModel> registerEmbeddings(List<List<double>> embeddings);

  Future<FaceRegistrationStatusModel> getRegistrationStatus();
}

class FaceRemoteDataSourceImpl implements FaceRemoteDataSource {
  final Dio _dio;
  const FaceRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<FaceRegisterResultModel> registerEmbeddings(List<List<double>> embeddings) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.faceRegisterEmbeddings,
        data: {'embeddings': embeddings},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed face registration response from server.');
      }
      return FaceRegisterResultModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  @override
  Future<FaceRegistrationStatusModel> getRegistrationStatus() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.faceRegistrationStatus);
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const ServerException('Malformed face registration status response from server.');
      }
      return FaceRegistrationStatusModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
