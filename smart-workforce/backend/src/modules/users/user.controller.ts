import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { userService } from './user.service';
import type { InviteUserInput, ListUsersQuery } from './user.validators';

export const listUsers = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListUsersQuery;
  const users = await userService.list(query);
  sendSuccess(res, users);
});

export const inviteUser = asyncHandler(async (req, res) => {
  const user = await userService.invite(req.body as InviteUserInput, actorFromRequest(req));
  sendSuccess(res, user, 201);
});
