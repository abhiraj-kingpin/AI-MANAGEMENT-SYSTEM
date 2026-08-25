import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { settingsService } from './settings.service';
import type { UpdateSettingsInput } from './settings.validators';

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.get();
  sendSuccess(res, settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.update(
    req.body as UpdateSettingsInput,
    actorFromRequest(req),
  );
  sendSuccess(res, settings);
});
