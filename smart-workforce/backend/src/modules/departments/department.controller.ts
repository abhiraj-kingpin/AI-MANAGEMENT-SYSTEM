import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { departmentService } from './department.service';
import type { ListDepartmentsQuery } from './department.validators';

export const listDepartments = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListDepartmentsQuery;
  const departments = await departmentService.list(query);
  sendSuccess(res, departments);
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.create(req.body);
  sendSuccess(res, { department }, 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.update(req.params.id, req.body);
  sendSuccess(res, { department });
});
