import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/AppError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}
