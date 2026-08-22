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
  if (env.AUTH_DISABLED) {
    req.user = DISABLED_ACTOR;
    next();
    return;
  }

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
