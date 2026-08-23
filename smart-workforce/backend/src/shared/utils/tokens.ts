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

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
