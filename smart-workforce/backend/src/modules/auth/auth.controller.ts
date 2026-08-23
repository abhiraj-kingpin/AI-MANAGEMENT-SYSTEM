import type { Request, Response } from 'express';
import { env, isProduction } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { authService } from './auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = `${env.API_PREFIX}/auth`;

function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

function extractRefreshToken(req: Request): string {
  const cookies = req.cookies as Record<string, string> | undefined;
  const body = req.body as { refreshToken?: string };
  const token = cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

  if (!token) {
    throw AppError.unauthorized('No refresh token provided.', 'MISSING_REFRESH_TOKEN');
  }
  return token;
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body, req.user!.role);
  sendSuccess(res, { user }, 201);
});

export const claimAccount = asyncHandler(async (req, res) => {
  const { refreshTokenExpiresAt, ...result } = await authService.claimAccount(
    req.body.email,
    req.body.password,
  );
  setRefreshCookie(res, result.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, { ...result, refreshTokenExpiresAt }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { refreshTokenExpiresAt, ...result } = await authService.login(
    req.body.email,
    req.body.password,
  );
  setRefreshCookie(res, result.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, { ...result, refreshTokenExpiresAt });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = extractRefreshToken(req);
  const { refreshTokenExpiresAt, ...result } = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, { ...result, refreshTokenExpiresAt });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user!.id);
  clearRefreshCookie(res);
  sendSuccess(res, { status: 'ok' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { status: 'ok' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, { status: 'ok' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, { status: 'ok' });
});

export const me = asyncHandler(async (req, res) => {
  const result = await authService.me(req.user!.id);
  sendSuccess(res, result);
});
