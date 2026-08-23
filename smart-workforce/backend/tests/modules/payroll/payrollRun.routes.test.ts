import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('payroll run routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/payroll/run').send({ month: '2026-08' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a manager from triggering a payroll run', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/run')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ month: '2026-08' });
    expect(res.status).toBe(403);
  });

  it('rejects an employee from polling a run status', async () => {
    const res = await request(app)
      .get('/api/v1/payroll/runs/some-run-id/status')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(403);
  });

  it('POST /payroll/run rejects a malformed month', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/run')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ month: 'August 2026' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payroll/run rejects a missing month', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/run')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('GET /payroll/runs/:runId/status 404s for an unknown run (in-memory lookup, no database involved)', async () => {
    const res = await request(app)
      .get('/api/v1/payroll/runs/does-not-exist/status')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(404);
  });
});
