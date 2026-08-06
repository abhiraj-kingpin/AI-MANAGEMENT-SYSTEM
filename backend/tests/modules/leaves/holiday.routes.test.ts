import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('holiday routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/holidays');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a plain employee from creating a holiday (read-only for them)', async () => {
    const res = await request(app)
      .post('/api/v1/holidays')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ name: 'Independence Day', date: '2026-08-15' });
    expect(res.status).toBe(403);
  });

  it('rejects a manager from creating a holiday (HR/Admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/holidays')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ name: 'Independence Day', date: '2026-08-15' });
    expect(res.status).toBe(403);
  });

  it('POST /holidays rejects a missing name (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/holidays')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ date: '2026-08-15' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /holidays rejects an invalid date', async () => {
    const res = await request(app)
      .post('/api/v1/holidays')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ name: 'Made Up Day', date: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('GET /holidays rejects a non-numeric year filter', async () => {
    const res = await request(app)
      .get('/api/v1/holidays?year=abcd')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(422);
  });
});
