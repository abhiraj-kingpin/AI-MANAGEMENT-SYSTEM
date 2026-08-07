/**
 * Base class for all expected/"operational" errors thrown deliberately by the app
 * (validation failures, not-found, unauthorized, business-rule violations, etc.).
 *
 * `error.middleware.ts` treats `AppError` instances as safe to expose to the client
 * (message + code), and anything else (programmer errors, unexpected exceptions)
 * as a 500 with a generic message so internals never leak.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational = true;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  /** 423 Locked — a resource that exists but is temporarily blocked, distinct from 401/403 which are about the caller's credentials/permissions. Used by auth.service.ts's login lockout (Phase 16). */
  static locked(message: string, code = 'LOCKED') {
    return new AppError(message, 423, code);
  }

  static unprocessable(message: string, code = 'UNPROCESSABLE_ENTITY', details?: unknown) {
    return new AppError(message, 422, code, details);
  }

  static internal(message = 'Something went wrong', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }
}
