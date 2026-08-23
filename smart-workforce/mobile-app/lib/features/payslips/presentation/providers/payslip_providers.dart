import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/features/payslips/data/datasources/payslip_remote_datasource.dart';
import 'package:ai_management_system/features/payslips/data/repositories_impl/payslip_repository_impl.dart';
import 'package:ai_management_system/features/payslips/domain/repositories/payslip_repository.dart';
import 'package:ai_management_system/features/payslips/domain/usecases/download_payslip_pdf_usecase.dart';
import 'package:ai_management_system/features/payslips/domain/usecases/get_my_payslips_usecase.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_controller.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_state.dart';

final _payslipRemoteDataSourceProvider = Provider<PayslipRemoteDataSource>((ref) {
  return PayslipRemoteDataSourceImpl(dio: ref.watch(dioClientProvider).dio);
});

final payslipRepositoryProvider = Provider<PayslipRepository>((ref) {
  return PayslipRepositoryImpl(remoteDataSource: ref.watch(_payslipRemoteDataSourceProvider));
});

final payslipControllerProvider = StateNotifierProvider<PayslipController, PayslipState>((ref) {
  final repository = ref.watch(payslipRepositoryProvider);
  return PayslipController(
    getMyPayslipsUseCase: GetMyPayslipsUseCase(repository),
    downloadPayslipPdfUseCase: DownloadPayslipPdfUseCase(repository),
  );
});
