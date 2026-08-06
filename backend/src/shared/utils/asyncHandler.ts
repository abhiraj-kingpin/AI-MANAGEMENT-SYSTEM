import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Express 4 doesn't catch rejected promises from async route handlers —
 * without this, a thrown error inside an `async (req, res) => {...}`
 * handler hangs the request instead of reaching `error.middleware.ts`.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
