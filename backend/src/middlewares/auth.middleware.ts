import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/AppError';
import { verifyAccessToken } from '../shared/utils/tokens';

/** Verifies the `Authorization: Bearer <accessToken>` header and attaches `req.user`. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or malformed Authorization header.', 'MISSING_TOKEN'));
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, employeeId: payload.employeeId };
    next();
  } catch {
    next(AppError.unauthorized('Session expired. Please log in again.', 'TOKEN_EXPIRED'));
  }
}
