import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { leaveTypeService } from './leaveType.service';

export const listLeaveTypes = asyncHandler(async (_req, res) => {
  const types = await leaveTypeService.list();
  sendSuccess(res, types);
});

export const createLeaveType = asyncHandler(async (req, res) => {
  const leaveType = await leaveTypeService.create(req.body);
  sendSuccess(res, { leaveType }, 201);
});
