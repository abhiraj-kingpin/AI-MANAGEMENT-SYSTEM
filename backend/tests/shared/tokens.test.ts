import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import {
  generateRandomToken,
  hashToken,
  signAccessToken,
  signQrToken,
  signRefreshToken,
  verifyAccessToken,
  verifyQrToken,
  verifyRefreshToken,
} from '../../src/shared/utils/tokens';

describe('shared/utils/tokens', () => {
  describe('access tokens', () => {
    it('round-trips the payload through sign/verify', () => {
      const token = signAccessToken({ sub: 'user-1', role: 'employee', employeeId: 'emp-1' });

      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe('user-1');
      expect(payload.role).toBe('employee');
      expect(payload.employeeId).toBe('emp-1');
    });

    it('rejects a token signed with the wrong secret', () => {
      const forged = jwt.sign({ sub: 'user-1', role: 'super_admin' }, 'wrong-secret');

      expect(() => verifyAccessToken(forged)).toThrow();
    });

    it('rejects an expired token', () => {
      const expired = jwt.sign({ sub: 'user-1', role: 'employee' }, env.JWT_ACCESS_SECRET, {
        expiresIn: -10, // already expired
      });

      expect(() => verifyAccessToken(expired)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('signs a JWT whose exp matches the returned expiresAt', () => {
      const { token, expiresAt } = signRefreshToken('user-1');

      const decoded = jwt.decode(token) as { exp: number; sub: string };
      expect(decoded.sub).toBe('user-1');
      expect(decoded.exp * 1000).toBe(expiresAt.getTime());
    });

    it('round-trips through verify', () => {
      const { token } = signRefreshToken('user-1');
      expect(verifyRefreshToken(token).sub).toBe('user-1');
    });

    it('rejects a token signed with the access-token secret (no cross-use)', () => {
      const wrongToken = jwt.sign({ sub: 'user-1' }, env.JWT_ACCESS_SECRET);
      expect(() => verifyRefreshToken(wrongToken)).toThrow();
    });
  });

  describe('QR tokens', () => {
    it('signs a JWT whose exp matches the returned expiresAt', () => {
      const { token, expiresAt } = signQrToken('geo-1', 5);

      const decoded = jwt.decode(token) as { exp: number; geofenceId: string };
      expect(decoded.geofenceId).toBe('geo-1');
      expect(decoded.exp * 1000).toBe(expiresAt.getTime());
    });

    it('round-trips through verify', () => {
      const { token } = signQrToken('geo-1', 5);
      expect(verifyQrToken(token).geofenceId).toBe('geo-1');
    });

    it('rejects a token signed with the refresh-token secret (no cross-use between trust boundaries)', () => {
      const wrongToken = jwt.sign({ geofenceId: 'geo-1' }, env.JWT_REFRESH_SECRET);
      expect(() => verifyQrToken(wrongToken)).toThrow();
    });

    it('rejects an expired QR token', () => {
      const expired = jwt.sign({ geofenceId: 'geo-1' }, env.QR_TOKEN_SECRET, { expiresIn: -10 });
      expect(() => verifyQrToken(expired)).toThrow();
    });

    it('two tokens for the same geofence signed in the same second are never identical', () => {
      const a = signQrToken('geo-1', 5);
      const b = signQrToken('geo-1', 5);
      expect(a.token).not.toBe(b.token);
    });
  });

  describe('hashToken', () => {
    it('is deterministic and never equals the input', () => {
      const hash1 = hashToken('same-input');
      const hash2 = hashToken('same-input');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe('same-input');
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // sha256 hex digest
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });
  });

  describe('generateRandomToken', () => {
    it('generates a hex string of the expected length and is non-deterministic', () => {
      const a = generateRandomToken(32);
      const b = generateRandomToken(32);

      expect(a).toHaveLength(64); // 32 bytes -> 64 hex chars
      expect(a).not.toBe(b);
    });
  });
});
