import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '../constants/roles';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  employeeId?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

/**
 * Refresh tokens are JWTs too (not opaque strings) so `refresh()` can reject
 * a forged/expired token via signature + `exp` check alone before ever
 * touching the database — see docs/architecture/07-authentication-flow.md §3.
 * Only the token's hash is ever persisted (shared/utils/tokens.ts#hashToken).
 *
 * `jti` is a random nonce, not read anywhere — its only job is guaranteeing
 * two tokens signed for the same user in the same second (iat/exp granularity
 * is whole seconds) are never byte-identical, so every rotation is a genuinely
 * new token/hash rather than an accidental collision.
 */
export function signRefreshToken(sub: string): IssuedRefreshToken {
  const token = jwt.sign({ sub, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'],
  });
  const decoded = jwt.decode(token) as { exp: number };
  return { token, expiresAt: new Date(decoded.exp * 1000) };
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}

export interface QrTokenPayload {
  geofenceId: string;
}

export interface IssuedQrToken {
  token: string;
  expiresAt: Date;
}

/**
 * QR attendance tokens are HMAC-signed JWTs, signed with their own secret
 * (not the session secrets above) — see docs/architecture/08-sequence-diagrams.md#2-qr-attendance.
 * `jti` guarantees uniqueness the same way it does for refresh tokens (see above).
 */
export function signQrToken(geofenceId: string, validForMinutes: number): IssuedQrToken {
  const token = jwt.sign({ geofenceId, jti: crypto.randomUUID() }, env.QR_TOKEN_SECRET, {
    expiresIn: `${validForMinutes}m` as SignOptions['expiresIn'],
  });
  const decoded = jwt.decode(token) as { exp: number };
  return { token, expiresAt: new Date(decoded.exp * 1000) };
}

export function verifyQrToken(token: string): QrTokenPayload {
  return jwt.verify(token, env.QR_TOKEN_SECRET) as QrTokenPayload;
}

/** SHA-256 hex digest — what actually gets stored/compared, never the raw token. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Used for password-reset tokens (not a JWT — a random opaque secret). */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
