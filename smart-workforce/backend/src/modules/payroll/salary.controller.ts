import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { salaryService } from './salary.service';
import type { ListSalariesQuery } from './salary.validators';

export const createSalary = asyncHandler(async (req, res) => {
  const salary = await salaryService.create(req.body);
  sendSuccess(res, { salary }, 201);
});

export const listSalaries = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListSalariesQuery;
  const result = await salaryService.list(query);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const updateSalary = asyncHandler(async (req, res) => {
  const salary = await salaryService.update(req.params.employeeId, req.body);
  sendSuccess(res, { salary });
});
