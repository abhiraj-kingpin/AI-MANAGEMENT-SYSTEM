import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { shiftAssignmentService } from './shiftAssignment.service';
import type { ListAssignmentsQuery } from './shiftAssignment.validators';

export const assignShift = asyncHandler(async (req, res) => {
  const assignment = await shiftAssignmentService.assign(req.body);
  sendSuccess(res, { assignment }, 201);
});

export const bulkAssignShift = asyncHandler(async (req, res) => {
  const result = await shiftAssignmentService.bulkAssign(req.body);
  sendSuccess(res, result, 201);
});

export const getMyShift = asyncHandler(async (req, res) => {
  const assignment = await shiftAssignmentService.getMyShift(actorFromRequest(req));
  sendSuccess(res, { assignment });
});

export const listRoster = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListAssignmentsQuery;
  const roster = await shiftAssignmentService.listRoster(query);
  sendSuccess(res, roster);
});
