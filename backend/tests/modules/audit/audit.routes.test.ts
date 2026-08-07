import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('audit-log routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/audit-logs');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects everyone but Super Admin', async () => {
    for (const role of ['hr', 'manager', 'employee'] as const) {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${tokenFor(role)}`);
      expect(res.status).toBe(403);
    }
  });

  it('rejects an invalid entityId', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?entityId=not-an-id')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid actorId', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?actorId=not-an-id')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });

  it('rejects a malformed date filter', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?from=not-a-date')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?limit=500')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });
});
