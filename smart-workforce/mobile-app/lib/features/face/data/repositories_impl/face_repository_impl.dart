import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/face/data/datasources/face_remote_datasource.dart';
import 'package:ai_management_system/features/face/domain/entities/face_register_result_entity.dart';
import 'package:ai_management_system/features/face/domain/entities/face_registration_status_entity.dart';
import 'package:ai_management_system/features/face/domain/repositories/face_repository.dart';

class FaceRepositoryImpl implements FaceRepository {
  final FaceRemoteDataSource _remoteDataSource;
  const FaceRepositoryImpl({required FaceRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<FaceRegisterResultEntity>> registerEmbeddings(
    List<List<double>> embeddings,
  ) async {
    try {
      return Success(await _remoteDataSource.registerEmbeddings(embeddings));
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<FaceRegistrationStatusEntity>> getRegistrationStatus() async {
    try {
      return Success(await _remoteDataSource.getRegistrationStatus());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }
}
