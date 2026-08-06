import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Exercises the real Express middleware chain (validate → authenticate →
 * requireRole) end to end. Every case here is rejected *before* the
 * controller would touch the database, so this suite needs no MongoDB
 * connection — auth.service.test.ts covers the DB-backed logic via mocks.
 */
describe('auth routes — validation and access control wiring', () => {
  const app = createApp();

  it('POST /auth/login rejects a malformed body with a 422 validation envelope', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('GET /auth/me rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('GET /auth/me rejects a malformed/garbage bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('POST /auth/register rejects an unauthenticated caller', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'x@acme.com', password: 'whatever123', role: 'employee' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('POST /auth/register rejects a caller authenticated as a plain employee (RBAC)', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'employee' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'x@acme.com', password: 'whatever123', role: 'employee' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /auth/register lets an HR-role caller past the RBAC gate (fails later, at validation, harmlessly)', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'hr' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email', password: 'short', role: 'employee' });

    // Got past auth + RBAC; now it's the payload that's invalid, not the caller.
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
