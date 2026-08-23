import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { payslipService } from './payslip.service';
import type { ListPayslipsQuery, MyPayslipsQuery } from './payslip.validators';

export const listPayslips = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListPayslipsQuery;
  const result = await payslipService.list(query);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const getMyPayslips = asyncHandler(async (req, res) => {
  const { month } = req.validated!.query as MyPayslipsQuery;
  const payslips = await payslipService.getMyPayslips(actorFromRequest(req), month);
  sendSuccess(res, payslips);
});

export const releasePayslip = asyncHandler(async (req, res) => {
  const payslip = await payslipService.release(req.params.id);
  sendSuccess(res, { payslip });
});

export const downloadPayslipPdf = asyncHandler(async (req, res) => {
  const { payslip, salary } = await payslipService.getForDownload(
    req.params.id,
    actorFromRequest(req),
  );
  const buffer = await payslipService.renderPdf(payslip, salary);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.month}.pdf"`);
  res.send(buffer);
});
