import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/AppError';
import type { Role } from '../shared/constants/roles';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action.', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
