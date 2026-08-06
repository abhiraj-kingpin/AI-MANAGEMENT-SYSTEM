import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { leaveService } from './leave.service';
import type { ListLeavesQuery, MyLeavesQuery } from './leave.validators';

export const applyLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.apply(actorFromRequest(req), req.body);
  sendSuccess(res, { leave }, 201);
});

export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancel(req.params.id, actorFromRequest(req));
  sendSuccess(res, { leave });
});

export const getMyLeaves = asyncHandler(async (req, res) => {
  const { status } = req.validated!.query as MyLeavesQuery;
  const leaves = await leaveService.getMyLeaves(actorFromRequest(req), status);
  sendSuccess(res, leaves);
});

export const getMyBalance = asyncHandler(async (req, res) => {
  const balances = await leaveService.getMyBalance(actorFromRequest(req));
  sendSuccess(res, balances);
});

export const listLeaves = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListLeavesQuery;
  const result = await leaveService.list(query, actorFromRequest(req));
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const approveLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.review(
    req.params.id,
    'approved',
    actorFromRequest(req),
    req.body.comment,
  );
  sendSuccess(res, { leave });
});

export const rejectLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.review(
    req.params.id,
    'rejected',
    actorFromRequest(req),
    req.body.comment,
  );
  sendSuccess(res, { leave });
});
