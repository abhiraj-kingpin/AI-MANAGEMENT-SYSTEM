import type { Response } from 'express';

/**
 * Consistent success envelope for every route in the app — see
 * docs/architecture/04-api-documentation.md for the full contract.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response {
  return res.status(statusCode).json({ success: true, data, ...(meta ? { meta } : {}) });
}
