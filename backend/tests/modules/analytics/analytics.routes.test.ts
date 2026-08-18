import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 * The employee-role rejections below resolve inside analytics.service.ts's
 * resolveEmployeeIds guard, which runs before any model call, so they need
 * no database either.
 */
describe('analytics routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee', employeeId?: string) {
    return signAccessToken({ sub: 'user-1', role, employeeId });
  }

  it('rejects an unauthenticated caller on every route', async () => {
    const routes = [
      '/api/v1/analytics/dashboard',
      '/api/v1/analytics/attendance-trend',
      '/api/v1/analytics/department-comparison',
      '/api/v1/analytics/export/csv',
      '/api/v1/analytics/export/pdf',
      '/api/v1/analytics/ai/late-risk',
      '/api/v1/analytics/ai/absenteeism-trend',
      '/api/v1/analytics/ai/anomalies',
    ];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    }
  });

  it('rejects a plain employee from the dashboard KPIs (team/org analytics is not self-service)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from the attendance trend', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/attendance-trend')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a manager from the cross-department comparison (HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/department-comparison')
      .set('Authorization', `Bearer ${tokenFor('manager', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a manager from the CSV export (HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/csv?from=2026-08-01&to=2026-08-31')
      .set('Authorization', `Bearer ${tokenFor('manager', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid departmentId on the dashboard query', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard?departmentId=not-an-id')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an out-of-range months value on the attendance trend', async () => {
    const tooMany = await request(app)
      .get('/api/v1/analytics/attendance-trend?months=25')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooMany.status).toBe(422);

    const tooFew = await request(app)
      .get('/api/v1/analytics/attendance-trend?months=0')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooFew.status).toBe(422);
  });

  it('rejects a malformed date on the department comparison', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/department-comparison?date=not-a-date')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });

  it('rejects a CSV export missing the required from/to range', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/csv')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });

  it('rejects a CSV export where `from` is after `to`', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/csv?from=2026-08-31&to=2026-08-01')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });

  it('rejects a manager from the PDF export (HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/pdf?from=2026-08-01&to=2026-08-31')
      .set('Authorization', `Bearer ${tokenFor('manager', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a PDF export missing the required from/to range (same schema as CSV)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/pdf')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });

  it('rejects a plain employee from the late-risk view', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/ai/late-risk')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from the absenteeism trend', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/ai/absenteeism-trend')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a manager from the anomaly sweep (HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/ai/anomalies')
      .set('Authorization', `Bearer ${tokenFor('manager', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects an out-of-range `days` value on the late-risk view', async () => {
    const tooFew = await request(app)
      .get('/api/v1/analytics/ai/late-risk?days=1')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooFew.status).toBe(422);

    const tooMany = await request(app)
      .get('/api/v1/analytics/ai/late-risk?days=999')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooMany.status).toBe(422);
  });

  it('rejects an out-of-range `limit` on the late-risk view', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/ai/late-risk?limit=0')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });

  it('rejects an out-of-range `months` value on the absenteeism trend', async () => {
    const tooFew = await request(app)
      .get('/api/v1/analytics/ai/absenteeism-trend?months=1')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooFew.status).toBe(422);

    const tooMany = await request(app)
      .get('/api/v1/analytics/ai/absenteeism-trend?months=25')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(tooMany.status).toBe(422);
  });

  it('rejects an out-of-range `days` value on the anomaly sweep', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/ai/anomalies?days=91')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`);
    expect(res.status).toBe(422);
  });
});
