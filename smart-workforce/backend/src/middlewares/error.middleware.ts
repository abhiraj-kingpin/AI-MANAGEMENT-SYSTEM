import type { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again later.';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = err.flatten();
  } else if (err instanceof MongooseError.ValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
  } else if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for "${err.path}".`;
  } else if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = `UPLOAD_${err.code}`;
    message = err.message;
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'A record with this value already exists.';
    details = err.keyValue;
  } else if (err instanceof Error) {
    message = isProduction ? message : err.message;
  }

  const logPayload = { statusCode, code, path: req.originalUrl, method: req.method };
  if (statusCode >= 500) {
    logger.error(message, { ...logPayload, err });
  } else {
    logger.warn(message, logPayload);
  }

  const body: ErrorEnvelope = { success: false, error: { code, message, details } };
  if (!isProduction && err instanceof Error) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

function isMongoDuplicateKeyError(
  err: unknown,
): err is { code: number; keyValue: Record<string, unknown> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}
