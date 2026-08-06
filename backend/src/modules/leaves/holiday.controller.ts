import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { holidayService } from './holiday.service';
import type { ListHolidaysQuery } from './holiday.validators';

export const listHolidays = asyncHandler(async (req, res) => {
  const { year } = req.validated!.query as ListHolidaysQuery;
  const holidays = await holidayService.list(year);
  sendSuccess(res, holidays);
});

export const createHoliday = asyncHandler(async (req, res) => {
  const holiday = await holidayService.create(req.body);
  sendSuccess(res, { holiday }, 201);
});
