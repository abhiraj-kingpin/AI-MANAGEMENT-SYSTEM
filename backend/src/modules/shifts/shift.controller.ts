import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { shiftService } from './shift.service';
import type { ListShiftsQuery } from './shift.validators';

export const createShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.create(req.body);
  sendSuccess(res, { shift }, 201);
});

export const listShifts = asyncHandler(async (req, res) => {
  const { includeInactive } = req.validated!.query as ListShiftsQuery;
  const shifts = await shiftService.list(includeInactive ?? false);
  sendSuccess(res, shifts);
});

export const updateShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.update(req.params.id, req.body);
  sendSuccess(res, { shift });
});

export const deactivateShift = asyncHandler(async (req, res) => {
  await shiftService.deactivate(req.params.id);
  sendSuccess(res, { status: 'ok' });
});
