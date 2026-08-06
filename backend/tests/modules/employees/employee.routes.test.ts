import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only the routes gated by `requireRole` at the route level (list,
 * search, create, delete) — those reject before ever touching the database,
 * same DB-free approach as tests/modules/auth/auth.routes.test.ts. The
 * per-resource scoping on get/update/upload (self vs. team vs. everyone) is
 * covered by the mocked unit tests in employee.service.test.ts instead.
 */
describe('employee routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('GET /employees rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/employees');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('GET /employees rejects a plain employee (list is HR/Manager/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /employees/search rejects a plain employee', async () => {
    const res = await request(app)
      .get('/api/v1/employees/search?q=jane')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(403);
  });

  it('POST /employees rejects a manager (create is HR/Admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /employees rejects a malformed body once past RBAC (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE /employees/:id rejects a manager (delete is HR/Admin only)', async () => {
    const res = await request(app)
      .delete('/api/v1/employees/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });
});
