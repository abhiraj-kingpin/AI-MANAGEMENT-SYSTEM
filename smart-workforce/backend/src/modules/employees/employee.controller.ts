import type { Request } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import type { EmployeeDocumentType } from './document.model';
import { employeeService } from './employee.service';
import type { ListEmployeesQuery } from './employee.validators';

function requireFile(req: Request): Express.Multer.File {
  if (!req.file) {
    throw AppError.badRequest('No file was uploaded.', 'FILE_REQUIRED');
  }
  return req.file;
}

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body, actorFromRequest(req));
  sendSuccess(res, { employee }, 201);
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployee(req.params.id, actorFromRequest(req));
  sendSuccess(res, { employee });
});

export const listEmployees = asyncHandler(async (req, res) => {
  const query = req.validated!.query as ListEmployeesQuery;
  const result = await employeeService.listEmployees(query, actorFromRequest(req));
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
});

export const searchEmployees = asyncHandler(async (req, res) => {
  const { q } = req.validated!.query as { q: string };
  const results = await employeeService.searchEmployees(q, actorFromRequest(req));
  sendSuccess(res, results);
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.params.id,
    req.body,
    actorFromRequest(req),
  );
  sendSuccess(res, { employee });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  await employeeService.deleteEmployee(req.params.id);
  sendSuccess(res, { status: 'ok' });
});

export const uploadEmployeeImage = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  const result = await employeeService.uploadProfileImage(
    req.params.id,
    { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname },
    actorFromRequest(req),
  );
  sendSuccess(res, result);
});

export const uploadEmployeeDocument = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  const { type } = req.body as { type: EmployeeDocumentType };
  const document = await employeeService.uploadDocument(
    req.params.id,
    { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname },
    type,
    actorFromRequest(req),
  );
  sendSuccess(res, { document }, 201);
});

export const listEmployeeDocuments = asyncHandler(async (req, res) => {
  const documents = await employeeService.listDocuments(req.params.id, actorFromRequest(req));
  sendSuccess(res, documents);
});
