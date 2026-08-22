import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/AppError';
import { verifyAccessToken } from '../shared/utils/tokens';
import { env } from '../config/env';

// Single opt-in bypass, gated by one env var: when AUTH_DISABLED=true, every
// request is treated as this fixed super_admin actor and the login screen is
// never required. Off (the default) restores normal JWT auth with one flip.
const DISABLED_ACTOR = {
  id: '6a89776861f6ab6e21c9d56b',
  role: 'super_admin' as const,
};

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  // A real Bearer token — from a genuine mobile-app login, most importantly
  // — always wins when present and valid, regardless of AUTH_DISABLED. This
  // is what AUTH_DISABLED=true previously skipped entirely, which silently
  // replaced every real employee's identity (including their employeeId)
  // with the fixed admin actor below on every single request.
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role, employeeId: payload.employeeId };
      next();
      return;
    } catch {
      // Falls through to the bypass below only if AUTH_DISABLED is on;
      // otherwise this is reported as the real auth failure it is.
    }
  }

  if (env.AUTH_DISABLED) {
    req.user = DISABLED_ACTOR;
    next();
    return;
  }

  next(
    header?.startsWith('Bearer ')
      ? AppError.unauthorized('Session expired. Please log in again.', 'TOKEN_EXPIRED')
      : AppError.unauthorized('Missing or malformed Authorization header.', 'MISSING_TOKEN'),
  );
}
