import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('attendance routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee', employeeId = 'emp-1') {
    return signAccessToken({ sub: 'user-1', role, employeeId });
  }

  it('POST /attendance/check-in rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/attendance/check-in').send({ method: 'manual' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('POST /attendance/check-in rejects an invalid method (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ method: 'teleport' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /attendance/sync rejects an unauthenticated caller', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/sync')
      .send({ punches: [{ clientGeneratedId: 'x', type: 'check_in', occurredAt: '2026-08-04' }] });
    expect(res.status).toBe(401);
  });

  it('POST /attendance/sync rejects an empty punches array', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/sync')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ punches: [] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /attendance/sync rejects a check_in punch missing a method', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/sync')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({
        punches: [
          { clientGeneratedId: 'uuid-1', type: 'check_in', occurredAt: '2026-08-04T09:00:00Z' },
        ],
      });
    expect(res.status).toBe(422);
  });

  it('POST /attendance/sync rejects a punch missing clientGeneratedId', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/sync')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({
        punches: [{ type: 'check_out', occurredAt: '2026-08-04T18:00:00Z' }],
      });
    expect(res.status).toBe(422);
  });

  it('POST /attendance/sync rejects a batch over the 100-punch cap', async () => {
    const punches = Array.from({ length: 101 }, (_, i) => ({
      clientGeneratedId: `uuid-${i}`,
      type: 'check_out',
      occurredAt: '2026-08-04T18:00:00Z',
    }));
    const res = await request(app)
      .post('/api/v1/attendance/sync')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ punches });
    expect(res.status).toBe(422);
  });

  it('GET /attendance rejects a plain employee (report is HR/Manager/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/attendance')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /attendance/export/excel rejects a Manager (export is HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/export/excel')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /attendance/:id/correct rejects a plain employee', async () => {
    const res = await request(app)
      .patch('/api/v1/attendance/507f1f77bcf86cd799439011/correct')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ reason: 'test' });
    expect(res.status).toBe(403);
  });

  it('PATCH /attendance/:id/correct rejects a body with no reason (422, not 500)', async () => {
    const res = await request(app)
      .patch('/api/v1/attendance/507f1f77bcf86cd799439011/correct')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ checkInAt: '2026-08-04T09:00:00Z' });
    expect(res.status).toBe(422);
  });

  it('POST /attendance/:id/approve-correction rejects a plain employee', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/507f1f77bcf86cd799439011/approve-correction')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /attendance/:id/request-correction requires auth but not a specific role', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/507f1f77bcf86cd799439011/request-correction')
      .send({ reason: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('POST /attendance/absence-sweep rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/attendance/absence-sweep').send({});
    expect(res.status).toBe(401);
  });

  it('POST /attendance/absence-sweep rejects a Manager (org-wide batch action is Super Admin/HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/absence-sweep')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /attendance/absence-sweep rejects a non-date value (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/absence-sweep')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ date: 'not-a-date' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
