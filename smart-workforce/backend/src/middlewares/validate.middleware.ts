import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

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
