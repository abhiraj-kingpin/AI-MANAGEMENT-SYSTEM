import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Runs a Zod schema against `{ body, query, params }`. On failure, forwards
 * the raw `ZodError` to `error.middleware.ts`, which already knows how to
 * turn it into a 422 `VALIDATION_ERROR` envelope. On success:
 *  - `req.body` is replaced with the parsed (defaulted/coerced) value —
 *    always safe to reassign, in every Express version.
 *  - the full parsed result is also stashed on `req.validated`, which is
 *    what controllers should read `query`/`params` from — `req.query` is
 *    getter-only in Express 5 (can't be overwritten in place) and, even in
 *    Express 4, holds only raw strings with no coercion/defaults applied.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });

    if (!result.success) {
      next(result.error);
      return;
    }

    const parsed = result.data as { body?: unknown; query?: unknown; params?: unknown };
    req.validated = parsed;
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    next();
  };
}
