import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:ai_management_system/core/error/exceptions.dart';
import 'package:ai_management_system/core/error/failures.dart';
import 'package:ai_management_system/core/utils/result.dart';
import 'package:ai_management_system/features/payslips/data/datasources/payslip_remote_datasource.dart';
import 'package:ai_management_system/features/payslips/domain/entities/payslip_entity.dart';
import 'package:ai_management_system/features/payslips/domain/repositories/payslip_repository.dart';

class PayslipRepositoryImpl implements PayslipRepository {
  final PayslipRemoteDataSource _remoteDataSource;
  const PayslipRepositoryImpl({required PayslipRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<PayslipEntity>>> getMyPayslips() async {
    try {
      return Success(await _remoteDataSource.getMyPayslips());
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    }
  }

  @override
  Future<Result<String>> downloadPayslipPdf({required String id, required String month}) async {
    try {
      final bytes = await _remoteDataSource.downloadPayslipPdf(id);
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/payslip-$month.pdf');
      await file.writeAsBytes(bytes, flush: true);
      return Success(file.path);
    } on ServerException catch (e) {
      return ResultFailure(ServerFailure(e.message, code: e.code));
    } on NetworkException catch (e) {
      return ResultFailure(NetworkFailure(e.message));
    } on FileSystemException {
      return const ResultFailure(CacheFailure('Could not save the payslip to this device.'));
    }
  }
}
