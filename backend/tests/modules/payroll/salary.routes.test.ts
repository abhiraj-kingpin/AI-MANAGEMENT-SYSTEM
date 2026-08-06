import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('salary routes — validation and access control wiring', () => {
  const app = createApp();
  const validSalary = {
    employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    baseSalary: 50000,
    effectiveFrom: '2026-01-01',
  };

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/salaries');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a manager (comp structure is Super Admin/HR only)', async () => {
    const res = await request(app)
      .get('/api/v1/salaries')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from creating a salary record', async () => {
    const res = await request(app)
      .post('/api/v1/salaries')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send(validSalary);
    expect(res.status).toBe(403);
  });

  it('POST /salaries rejects a negative baseSalary (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/salaries')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ ...validSalary, baseSalary: -1 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /salaries rejects a non-3-letter currency code', async () => {
    const res = await request(app)
      .post('/api/v1/salaries')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ ...validSalary, currency: 'RUPEES' });
    expect(res.status).toBe(422);
  });

  it('PATCH /salaries/:employeeId rejects an empty update body', async () => {
    const res = await request(app)
      .patch('/api/v1/salaries/aaaaaaaaaaaaaaaaaaaaaaaa')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({});
    expect(res.status).toBe(422);
  });
});
