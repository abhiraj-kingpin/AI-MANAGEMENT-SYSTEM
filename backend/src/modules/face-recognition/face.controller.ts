import { AppError } from '../../shared/errors/AppError';
import { actorFromRequest } from '../../shared/utils/actor';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { faceService } from './face.service';
import type {
  RegisterFaceInput,
  RegistrationStatusQuery,
  VerifyFaceInput,
} from './face.validators';

export const registerFace = asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw AppError.badRequest('Upload at least 3 photos.', 'FILES_REQUIRED');
  }
  const { employeeId } = req.body as RegisterFaceInput;

  const result = await faceService.register(
    files.map((f) => f.buffer),
    employeeId,
    actorFromRequest(req),
  );
  sendSuccess(res, result, 201);
});

export const registrationStatus = asyncHandler(async (req, res) => {
  const { employeeId } = req.validated!.query as RegistrationStatusQuery;
  const status = await faceService.getRegistrationStatus(employeeId, actorFromRequest(req));
  sendSuccess(res, status);
});

export const verifyFace = asyncHandler(async (req, res) => {
  const { embedding } = req.body as VerifyFaceInput;
  const result = await faceService.verify(actorFromRequest(req), embedding);
  sendSuccess(res, result);
});

export const deleteFaceData = asyncHandler(async (req, res) => {
  await faceService.deleteFaceData(req.params.employeeId);
  sendSuccess(res, { status: 'ok' });
});
