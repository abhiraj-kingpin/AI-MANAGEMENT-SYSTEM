import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { payrollRunService } from './payrollRun.service';

export const runPayroll = asyncHandler(async (req, res) => {
  const run = await payrollRunService.start(req.body);
  sendSuccess(res, run, 202);
});

export const getPayrollRunStatus = asyncHandler(async (req, res) => {
  const run = payrollRunService.getStatus(req.params.runId);
  if (!run) {
    throw AppError.notFound('No payroll run found with that id.');
  }
  sendSuccess(res, run);
});
