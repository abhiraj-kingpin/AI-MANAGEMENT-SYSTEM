import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('payslip routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee', employeeId?: string) {
    return signAccessToken({ sub: 'user-1', role, employeeId });
  }

  it('rejects an unauthenticated caller on every route', async () => {
    const resMe = await request(app).get('/api/v1/payslips/me');
    expect(resMe.status).toBe(401);
    expect(resMe.body.error.code).toBe('MISSING_TOKEN');

    const resList = await request(app).get('/api/v1/payslips');
    expect(resList.status).toBe(401);

    // /:id/pdf has no RBAC gate of its own (access is scoped inside the
    // service — see payslip.routes.ts) but still runs `authenticate` first.
    const resPdf = await request(app).get('/api/v1/payslips/payslip-1/pdf');
    expect(resPdf.status).toBe(401);
  });

  it('rejects a plain employee from the HR list endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/payslips')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a manager from releasing a payslip (HR/Admin only)', async () => {
    const res = await request(app)
      .patch('/api/v1/payslips/payslip-1/release')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('GET /payslips/me rejects a malformed month filter', async () => {
    const res = await request(app)
      .get('/api/v1/payslips/me?month=2026-8')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payslips rejects a malformed month filter for a reviewer', async () => {
    const res = await request(app)
      .get('/api/v1/payslips?month=not-a-month')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });

  it('GET /payslips rejects an invalid status filter', async () => {
    const res = await request(app)
      .get('/api/v1/payslips?status=archived')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });
});
