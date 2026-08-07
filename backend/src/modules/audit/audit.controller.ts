import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { listAuditLogs } from './audit.service';
import type { ListAuditLogsQuery } from './audit.validators';

export const list = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListAuditLogsQuery;
  const result = await listAuditLogs(query);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});
